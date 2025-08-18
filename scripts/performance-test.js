#!/usr/bin/env node

/**
 * Performance testing and benchmarking script
 * Runs automated performance tests and generates reports
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const PERFORMANCE_THRESHOLDS = {
  unitConversion: 100, // ms
  currencyAPI: 2000, // ms
  timeZoneConversion: 50, // ms
  componentRender: 100, // ms
  bundleSize: 500, // KB
  memoryUsage: 50 // MB
}

async function runPerformanceTests() {
  console.log('🚀 Running Performance Tests...\n')

  const results = {
    timestamp: new Date().toISOString(),
    tests: {},
    bundleAnalysis: {},
    passed: 0,
    failed: 0
  }

  try {
    // Run Vitest performance tests
    console.log('📊 Running unit performance tests...')
    const testOutput = execSync('npm run test:run -- src/test/performance.test.ts', {
      encoding: 'utf8',
      stdio: 'pipe'
    })
    
    console.log('✅ Unit performance tests completed')
    results.tests.unit = 'passed'
    results.passed++

  } catch (error) {
    console.error('❌ Unit performance tests failed:', error.message)
    results.tests.unit = 'failed'
    results.failed++
  }

  try {
    // Build and analyze bundle
    console.log('📦 Building and analyzing bundle...')
    execSync('npm run build', { stdio: 'pipe' })
    
    const bundleStats = analyzeBundleSize()
    results.bundleAnalysis = bundleStats
    
    if (bundleStats.totalSize < PERFORMANCE_THRESHOLDS.bundleSize * 1024) {
      console.log(`✅ Bundle size: ${(bundleStats.totalSize / 1024).toFixed(2)}KB (under ${PERFORMANCE_THRESHOLDS.bundleSize}KB threshold)`)
      results.tests.bundleSize = 'passed'
      results.passed++
    } else {
      console.log(`❌ Bundle size: ${(bundleStats.totalSize / 1024).toFixed(2)}KB (exceeds ${PERFORMANCE_THRESHOLDS.bundleSize}KB threshold)`)
      results.tests.bundleSize = 'failed'
      results.failed++
    }

  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message)
    results.tests.bundleSize = 'failed'
    results.failed++
  }

  // Generate performance report
  generatePerformanceReport(results)

  console.log('\n📈 Performance Test Summary:')
  console.log(`✅ Passed: ${results.passed}`)
  console.log(`❌ Failed: ${results.failed}`)
  
  if (results.failed > 0) {
    console.log('\n⚠️  Some performance tests failed. Check the report for details.')
    process.exit(1)
  } else {
    console.log('\n🎉 All performance tests passed!')
  }
}

function analyzeBundleSize() {
  const distPath = path.join(process.cwd(), 'dist')
  
  if (!fs.existsSync(distPath)) {
    throw new Error('Build directory not found. Run npm run build first.')
  }

  const stats = {
    totalSize: 0,
    files: {},
    chunks: {}
  }

  function analyzeDirectory(dir, prefix = '') {
    const files = fs.readdirSync(dir)
    
    for (const file of files) {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        analyzeDirectory(filePath, `${prefix}${file}/`)
      } else {
        const size = stat.size
        const relativePath = `${prefix}${file}`
        
        stats.totalSize += size
        stats.files[relativePath] = size
        
        // Categorize chunks
        if (file.endsWith('.js')) {
          if (file.includes('vendor')) {
            stats.chunks.vendor = (stats.chunks.vendor || 0) + size
          } else if (file.includes('chunk')) {
            stats.chunks.async = (stats.chunks.async || 0) + size
          } else {
            stats.chunks.main = (stats.chunks.main || 0) + size
          }
        }
      }
    }
  }

  analyzeDirectory(distPath)
  return stats
}

function generatePerformanceReport(results) {
  const reportPath = path.join(process.cwd(), 'performance-report.json')
  
  // Load previous results if they exist
  let historicalData = []
  if (fs.existsSync(reportPath)) {
    try {
      const existingData = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
      historicalData = Array.isArray(existingData) ? existingData : [existingData]
    } catch (error) {
      console.warn('Could not load previous performance data:', error.message)
    }
  }

  // Add current results
  historicalData.push(results)
  
  // Keep only last 10 results
  if (historicalData.length > 10) {
    historicalData = historicalData.slice(-10)
  }

  // Write updated report
  fs.writeFileSync(reportPath, JSON.stringify(historicalData, null, 2))
  console.log(`📄 Performance report saved to: ${reportPath}`)

  // Generate HTML report
  generateHTMLReport(historicalData)
}

function generateHTMLReport(data) {
  const htmlPath = path.join(process.cwd(), 'performance-report.html')
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Universal Converter - Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; border-radius: 5px; min-width: 150px; text-align: center; }
        .passed { background: #d4edda; color: #155724; }
        .failed { background: #f8d7da; color: #721c24; }
        .chart { margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
        th { background: #f8f9fa; }
        .trend-up { color: #dc3545; }
        .trend-down { color: #28a745; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Universal Converter Performance Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>

        <div class="metrics">
            ${generateMetricsHTML(data[data.length - 1])}
        </div>

        <div class="chart">
            <h2>📊 Performance Trends</h2>
            ${generateTrendsHTML(data)}
        </div>

        <div class="details">
            <h2>📋 Detailed Results</h2>
            ${generateDetailsHTML(data)}
        </div>
    </div>
</body>
</html>
  `

  fs.writeFileSync(htmlPath, html)
  console.log(`📊 HTML report generated: ${htmlPath}`)
}

function generateMetricsHTML(latestResult) {
  const metrics = []
  
  for (const [test, result] of Object.entries(latestResult.tests)) {
    const className = result === 'passed' ? 'passed' : 'failed'
    metrics.push(`
      <div class="metric ${className}">
        <h3>${test}</h3>
        <p>${result === 'passed' ? '✅ Passed' : '❌ Failed'}</p>
      </div>
    `)
  }

  if (latestResult.bundleAnalysis.totalSize) {
    const sizeKB = (latestResult.bundleAnalysis.totalSize / 1024).toFixed(2)
    metrics.push(`
      <div class="metric">
        <h3>Bundle Size</h3>
        <p>${sizeKB} KB</p>
      </div>
    `)
  }

  return metrics.join('')
}

function generateTrendsHTML(data) {
  // Simple trend analysis
  const trends = []
  
  if (data.length >= 2) {
    const current = data[data.length - 1]
    const previous = data[data.length - 2]
    
    if (current.bundleAnalysis.totalSize && previous.bundleAnalysis.totalSize) {
      const change = current.bundleAnalysis.totalSize - previous.bundleAnalysis.totalSize
      const changeKB = (change / 1024).toFixed(2)
      const direction = change > 0 ? 'trend-up' : 'trend-down'
      const arrow = change > 0 ? '↗️' : '↘️'
      
      trends.push(`
        <p class="${direction}">
          Bundle Size: ${arrow} ${Math.abs(parseFloat(changeKB))} KB ${change > 0 ? 'increase' : 'decrease'}
        </p>
      `)
    }
  }

  return trends.length > 0 ? trends.join('') : '<p>No trend data available yet.</p>'
}

function generateDetailsHTML(data) {
  const rows = data.map(result => `
    <tr>
      <td>${new Date(result.timestamp).toLocaleString()}</td>
      <td>${result.passed}</td>
      <td>${result.failed}</td>
      <td>${result.bundleAnalysis.totalSize ? (result.bundleAnalysis.totalSize / 1024).toFixed(2) + ' KB' : 'N/A'}</td>
    </tr>
  `).join('')

  return `
    <table>
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>Passed</th>
          <th>Failed</th>
          <th>Bundle Size</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `
}

// Run the performance tests
runPerformanceTests().catch(error => {
  console.error('Performance testing failed:', error)
  process.exit(1)
})