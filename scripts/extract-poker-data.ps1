param(
  [string]$WorkbookPath = "./data/controle-poker.xlsx",
  [string]$OutputPath = "./data/mockData.json"
)

$ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
$tmpRoot = Join-Path $env:TEMP ("poker-xlsx-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tmpRoot -Force | Out-Null
$zipPath = Join-Path $tmpRoot 'workbook.zip'
$extractPath = Join-Path $tmpRoot 'unzipped'
Copy-Item -LiteralPath $WorkbookPath -Destination $zipPath -Force
Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

function Get-SharedStrings([string]$path){
  [xml]$xml = Get-Content $path
  $nsm = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
  $nsm.AddNamespace('d',$ns)
  $arr=@()
  foreach($si in $xml.SelectNodes('//d:si',$nsm)){
    $tNodes = $si.SelectNodes('.//d:t',$nsm)
    $arr += (($tNodes | ForEach-Object { $_.'#text' }) -join '')
  }
  return $arr
}

function ParseSheet([string]$sheetPath, $ss){
  [xml]$xml = Get-Content $sheetPath
  $nsm = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
  $nsm.AddNamespace('d',$ns)
  $rows=@()
  foreach($r in $xml.SelectNodes('//d:sheetData/d:row',$nsm)){
    $obj=[ordered]@{A=$null;B=$null;C=$null;D=$null;E=$null}
    foreach($c in $r.SelectNodes('./d:c',$nsm)){
      $ref=[regex]::Match($c.r,'[A-Z]+').Value
      if('A','B','C','D','E' -notcontains $ref){ continue }
      $vNode=$c.SelectSingleNode('./d:v',$nsm)
      $value = if($vNode){ $vNode.InnerText } else { $null }
      if($c.t -eq 's' -and $null -ne $value){ $value = $ss[[int]$value] }
      $obj[$ref] = $value
    }
    $rows += [pscustomobject]$obj
  }
  return $rows
}

function ExcelDateToIso([string]$serial){
  if([string]::IsNullOrWhiteSpace($serial)){ return $null }
  try {
    $d = [double]::Parse($serial, [System.Globalization.CultureInfo]::InvariantCulture)
    $base = [datetime]'1899-12-30'
    return $base.AddDays($d).ToString('yyyy-MM-dd')
  } catch {
    return $serial
  }
}

function ToNum([string]$v){
  if([string]::IsNullOrWhiteSpace($v)){ return 0 }
  try { return [double]::Parse($v, [System.Globalization.CultureInfo]::InvariantCulture) } catch { return 0 }
}

$baseXl = Join-Path $extractPath 'xl'
$ss = Get-SharedStrings (Join-Path $baseXl 'sharedStrings.xml')
$rows = @()
$rows += ParseSheet (Join-Path $baseXl 'worksheets\sheet1.xml') $ss
$rows += ParseSheet (Join-Path $baseXl 'worksheets\sheet2.xml') $ss

$entries = @()
foreach($r in $rows){
  $name=$r.B
  $dateIso = ExcelDateToIso $r.A
  if([string]::IsNullOrWhiteSpace($name) -or [string]::IsNullOrWhiteSpace($dateIso)){ continue }
  if($r.A -eq 'Data' -or $name -eq 'Jogador'){ continue }
  $entries += [pscustomobject]@{
    date = $dateIso
    player = $name
    buyIn = (ToNum $r.C)
    cashOut = (ToNum $r.D)
    net = (ToNum $r.E)
  }
}

$sessions = $entries | Group-Object date | Sort-Object Name | ForEach-Object {
  $players = $_.Group | ForEach-Object {
    $status = if($_.net -gt 0){'a receber'} elseif($_.net -lt 0){'a pagar'} else {'quitado'}
    [pscustomobject]@{
      name = $_.player
      buyIn = $_.buyIn
      cashOut = $_.cashOut
      net = $_.net
      paymentStatus = $status
    }
  }
  [pscustomobject]@{
    id = "sessao-" + $_.Name
    date = $_.Name
    players = $players
    totals = [pscustomobject]@{
      buyIn = ($players | Measure-Object buyIn -Sum).Sum
      cashOut = ($players | Measure-Object cashOut -Sum).Sum
      net = ($players | Measure-Object net -Sum).Sum
      playersCount = $players.Count
    }
  }
}

$allPlayers = $entries | Group-Object player | ForEach-Object {
  $buyIn = ($_.Group | Measure-Object buyIn -Sum).Sum
  $cashOut = ($_.Group | Measure-Object cashOut -Sum).Sum
  $net = ($_.Group | Measure-Object net -Sum).Sum
  [pscustomobject]@{
    name = $_.Name
    buyIn = $buyIn
    cashOut = $cashOut
    net = $net
    sessions = ($_.Group | Group-Object date).Count
    paymentStatus = if($net -gt 0){'a receber'} elseif($net -lt 0){'a pagar'} else {'quitado'}
  }
} | Sort-Object net -Descending

$result = [pscustomobject]@{
  generatedAt = (Get-Date).ToString('s')
  sourceFile = 'data/controle-poker.xlsx'
  sessions = $sessions
  playersSummary = $allPlayers
}

$result | ConvertTo-Json -Depth 8 | Set-Content -Path $OutputPath -Encoding UTF8
Remove-Item $tmpRoot -Recurse -Force
Write-Output "Generated $OutputPath"
