export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/30 backdrop-blur-lg">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-12">
          {/* 左侧：Logo + 描述 */}
          <div className="flex-shrink-0 lg:max-w-md">
            <div className="flex items-center mb-6">
              <img
                src="/logo/brand-logo-transparent.svg"
                alt="VidFab"
                className="h-16 w-auto"
              />
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Advanced AI video creation platform that empowers everyone to create professional video content effortlessly.
            </p>
          </div>

          {/* 右侧：菜单容器 */}
          <div className="flex flex-col sm:flex-row gap-8 lg:gap-16">
            {/* AI Video 菜单 */}
            <div className="min-w-[140px]">
              <h3 className="text-white font-semibold mb-6 text-base">AI Video</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="/text-to-video" className="text-gray-400 hover:text-white transition-colors duration-200 ease-out">
                    Text to Video
                  </a>
                </li>
                <li>
                  <a href="/image-to-video" className="text-gray-400 hover:text-white transition-colors duration-200 ease-out">
                    Image to Video
                  </a>
                </li>
                <li>
                  <a href="/ai-video-effects" className="text-gray-400 hover:text-white transition-colors duration-200 ease-out">
                    AI Video Effects
                  </a>
                </li>
              </ul>
            </div>

            {/* Company 菜单 */}
            <div className="min-w-[140px]">
              <h3 className="text-white font-semibold mb-6 text-base">Company</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="/about" className="text-gray-400 hover:text-white transition-colors duration-200 ease-out">
                    About
                  </a>
                </li>
                <li>
                  <a href="/pricing" className="text-gray-400 hover:text-white transition-colors duration-200 ease-out">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="/contact" className="text-gray-400 hover:text-white transition-colors duration-200 ease-out">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="/terms-of-service" className="text-gray-400 hover:text-white transition-colors duration-200 ease-out">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="text-gray-400 hover:text-white transition-colors duration-200 ease-out">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} VidFab. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a
              href="https://x.com/vidfab_ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-cyan-400 transition-colors"
              aria-label="Twitter/X"
            >
              <span className="sr-only">Twitter/X</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
            <a
              href="https://www.youtube.com/@vidfab-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-red-500 transition-colors"
              aria-label="YouTube"
            >
              <span className="sr-only">YouTube</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            <a
              href="https://www.tiktok.com/@vidfab"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-purple-500 transition-colors"
              aria-label="TikTok"
            >
              <span className="sr-only">TikTok</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
