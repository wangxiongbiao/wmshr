param (
    [string]$Token = $env:CF_API_TOKEN,
    [string]$Key = $env:CF_API_KEY,
    [string]$Email = "qqq2www2999@gmail.com",
    [string]$ZoneId = "21d6c61fecca97b7897e17736fa4d70f",
    [string[]]$Subdomains = @("v4", "admin-v4"),
    [string]$Target = "cname.vercel-dns.com"
)

$headers = @{
    "Content-Type" = "application/json"
}

if (![string]::IsNullOrWhiteSpace($Token)) {
    $headers["Authorization"] = "Bearer $Token"
} elseif (![string]::IsNullOrWhiteSpace($Key)) {
    $headers["X-Auth-Key"] = $Key
    $headers["X-Auth-Email"] = $Email
} else {
    Write-Error "缺少 Cloudflare 鉴权凭据！请提供 -Token <API_TOKEN> 或 -Key <GLOBAL_API_KEY>"
    exit 1
}

foreach ($sub in $Subdomains) {
    $body = @{
        type = "CNAME"
        name = $sub
        content = $Target
        ttl = 1
        proxied = $false
    } | ConvertTo-Json

    Write-Host "正在为 dutylix.com 添加 DNS 记录: $sub -> $Target (仅 DNS)..."
    try {
        $res = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records" -Method Post -Headers $headers -Body $body
        if ($res.success) {
            Write-Host "✓ DNS 解析记录添加成功: $($res.result.name) -> $($res.result.content)" -ForegroundColor Green
        } else {
            Write-Warning ($res.errors | ConvertTo-Json)
        }
    } catch {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Warning "添加 $sub 失败: $($reader.ReadToEnd())"
    }
}