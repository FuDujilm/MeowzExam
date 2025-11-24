# Next.js构建脚本 - 解决Windows中文路径权限问题
# 此脚本会临时重命名有问题的系统目录,构建完成后恢复

$ErrorActionPreference = "Stop"

Write-Host "=== Next.js 构建脚本 ===" -ForegroundColor Cyan
Write-Host ""

# 定义需要临时重命名的目录
$problematicDirs = @(
    @{
        Path = "$env:APPDATA\Microsoft\Windows\Start Menu\程序"
        TempName = "Programs_temp"
    }
)

# 保存已重命名的目录,用于恢复
$renamedDirs = @()

try {
    # 第一步:重命名问题目录
    Write-Host "步骤 1: 临时重命名问题目录..." -ForegroundColor Yellow
    foreach ($dir in $problematicDirs) {
        if (Test-Path $dir.Path) {
            $parentPath = Split-Path $dir.Path -Parent
            $tempPath = Join-Path $parentPath $dir.TempName

            Write-Host "  重命名: $($dir.Path) -> $tempPath" -ForegroundColor Gray
            Rename-Item -Path $dir.Path -NewName $dir.TempName -Force

            $renamedDirs += @{
                Original = $dir.Path
                Temp = $tempPath
                OriginalName = Split-Path $dir.Path -Leaf
            }
        }
    }
    Write-Host "✓ 目录重命名完成" -ForegroundColor Green
    Write-Host ""

    # 第二步:清理构建缓存
    Write-Host "步骤 2: 清理构建缓存..." -ForegroundColor Yellow
    if (Test-Path ".next") {
        Remove-Item ".next" -Recurse -Force
        Write-Host "✓ 缓存已清理" -ForegroundColor Green
    } else {
        Write-Host "  (无需清理)" -ForegroundColor Gray
    }
    Write-Host ""

    # 第三步:执行构建
    Write-Host "步骤 3: 开始构建..." -ForegroundColor Yellow
    Write-Host ""

    $buildProcess = Start-Process -FilePath "pnpm" -ArgumentList "run", "build" -NoNewWindow -Wait -PassThru

    if ($buildProcess.ExitCode -eq 0) {
        Write-Host ""
        Write-Host "✓ 构建成功!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "✗ 构建失败 (退出码: $($buildProcess.ExitCode))" -ForegroundColor Red
        throw "构建失败"
    }

} catch {
    Write-Host ""
    Write-Host "✗ 错误: $_" -ForegroundColor Red
    $exitCode = 1
} finally {
    # 第四步:恢复目录名称
    Write-Host ""
    Write-Host "步骤 4: 恢复目录名称..." -ForegroundColor Yellow

    foreach ($dir in $renamedDirs) {
        if (Test-Path $dir.Temp) {
            try {
                Write-Host "  恢复: $($dir.Temp) -> $($dir.Original)" -ForegroundColor Gray
                Rename-Item -Path $dir.Temp -NewName $dir.OriginalName -Force
            } catch {
                Write-Host "  警告: 无法恢复 $($dir.Temp): $_" -ForegroundColor Yellow
            }
        }
    }

    Write-Host "✓ 目录恢复完成" -ForegroundColor Green
    Write-Host ""

    if ($exitCode -eq 1) {
        Write-Host "=== 构建失败 ===" -ForegroundColor Red
        exit 1
    } else {
        Write-Host "=== 构建完成 ===" -ForegroundColor Cyan
    }
}
