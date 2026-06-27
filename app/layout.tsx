import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VideoEdit Pro - 口播影片自動剪輯',
  description: '上傳口播影片，自動生成繁體中文字幕，一鍵剪輯、燒錄字幕、匯出 MP4',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body className="font-tc bg-gray-900 text-white min-h-screen">
        {children}
      </body>
    </html>
  )
}
