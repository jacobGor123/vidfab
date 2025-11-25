"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Menu, X, LogIn, ChevronDown } from "lucide-react"
import Link from "next/link"
import { UserMenu } from "@/components/user-menu"
import { GetStartedButton } from "@/components/ui/get-started-button"
import { CreditsDisplaySimple } from "@/components/credits-display-simple"
import { isBlackFridayActive } from "@/lib/black-friday/coupons"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"

interface NavbarProps {
  scrolled: boolean
}

export function Navbar({ scrolled }: NavbarProps) {
  // 黑五横幅是否显示
  const [bannerVisible, setBannerVisible] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>('free')
  const [isInitialized, setIsInitialized] = useState(false)
  const { data: session, status } = useSession()
  const pathname = usePathname()

  // 检测是否是黑五页面
  const isBlackFridayPage = pathname === '/black-friday-sale-2025'

  useEffect(() => {
    // 检查黑五活动是否进行中
    const isActive = isBlackFridayActive()
    if (!isActive) {
      setBannerVisible(false)
      return
    }

    // 检查用户是否关闭了横幅
    const dismissed = localStorage.getItem('bf2025_banner_dismissed')
    setBannerVisible(dismissed !== 'true')
  }, [])

  // Fetch user subscription status
  useEffect(() => {
    // 重置状态，避免状态混乱
    if (status === 'loading') {
      setIsInitialized(false)
      return
    }

    if (session?.user?.uuid && status === 'authenticated') {
      fetch('/api/subscription/status')
        .then(res => {
          if (!res.ok) {
            if (res.status !== 401) {
              console.warn('Failed to fetch subscription status:', res.status)
            }
            setSubscriptionPlan('free')
            setIsInitialized(true)
            return
          }
          return res.json()
        })
        .then(data => {
          if (data && data.success && data.subscription) {
            setSubscriptionPlan(data.subscription.plan_id)
          } else {
            setSubscriptionPlan('free')
          }
          setIsInitialized(true)
        })
        .catch(err => {
          // Silently handle errors
          setSubscriptionPlan('free')
          setIsInitialized(true)
        })
    } else if (status === 'unauthenticated') {
      setSubscriptionPlan('free')
      setIsInitialized(true)
    }
  }, [session?.user?.uuid, status])

  // 判断是否显示按钮
  // 规则：非create/studio页面时都显示，登录/订阅用户显示"My Studio"，其他显示"Start for free"
  const isCreatePage = pathname?.startsWith('/create') || pathname?.startsWith('/studio') || false
  const isSubscribed = subscriptionPlan !== 'free'

  // 严格的显示条件：所有状态都必须稳定
  const shouldShowStartButton = Boolean(
    isInitialized &&
    status !== 'loading' &&
    !isCreatePage &&
    pathname // 确保pathname已经加载
  )

  // 根据登录和订阅状态确定按钮文案
  const buttonText = (session?.user || isSubscribed) ? 'My Studio' : 'Start for free'

  return (
    <header
      className={cn(
        "left-0 right-0 z-50 transition-all duration-300",
        isBlackFridayPage
          ? "relative bg-[#0a0a1a] border-b border-purple-500/30"
          : cn(
              "fixed",
              bannerVisible ? "top-[48px]" : "top-0",
              scrolled ? "bg-black/30 backdrop-blur-lg border-b border-white/10" : "bg-transparent"
            ),
      )}
    >
      <div className="mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
          <Link
              href="/"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-300 ease-apple"
            >
              <Image
                src="/logo/brand-logo-transparent.svg"
                alt="VidFab"
                width={140}
                height={56}
                className="h-10 sm:h-12 md:h-14 w-auto"
                priority
              />
             </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            {!isCreatePage && (
              <>
                <Link
                  href="/"
                  className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-300 ease-apple"
                >
                  Home
                </Link>

                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-300 ease-apple bg-transparent hover:bg-white/10 data-[state=open]:!bg-white/10 data-[active]:!bg-white/10 focus:!bg-white/10">
                        AI Studio
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="grid grid-cols-2 gap-6 p-4 w-[420px] bg-black/95 backdrop-blur-lg border border-white/10 rounded-lg">
                          {/* AI Video Section */}
                          <div className="min-w-0">
                            <div className="text-xs uppercase font-semibold text-gray-400 tracking-wider mb-3 px-3">
                              AI Video
                            </div>
                            <div className="space-y-1">
                              <NavigationMenuLink asChild>
                                <Link
                                  href="/text-to-video"
                                  className="block select-none rounded-md px-3 py-2 leading-none no-underline outline-none transition-colors hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                                >
                                  <div className="text-sm font-medium leading-none text-white whitespace-nowrap">
                                    Text to Video
                                  </div>
                                </Link>
                              </NavigationMenuLink>
                              <NavigationMenuLink asChild>
                                <Link
                                  href="/image-to-video"
                                  className="block select-none rounded-md px-3 py-2 leading-none no-underline outline-none transition-colors hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                                >
                                  <div className="text-sm font-medium leading-none text-white whitespace-nowrap">
                                    Image to Video
                                  </div>
                                </Link>
                              </NavigationMenuLink>
                              <NavigationMenuLink asChild>
                                <Link
                                  href="/ai-video-effects"
                                  className="block select-none rounded-md px-3 py-2 leading-none no-underline outline-none transition-colors hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                                >
                                  <div className="text-sm font-medium leading-none text-white whitespace-nowrap">
                                    AI Video Effects
                                  </div>
                                </Link>
                              </NavigationMenuLink>
                            </div>
                          </div>

                          {/* AI Image Section */}
                          <div className="min-w-0">
                            <div className="text-xs uppercase font-semibold text-gray-400 tracking-wider mb-3 px-3">
                              AI Image
                            </div>
                            <div className="space-y-1">
                              <NavigationMenuLink asChild>
                                <Link
                                  href="/text-to-image"
                                  className="block select-none rounded-md px-3 py-2 leading-none no-underline outline-none transition-colors hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                                >
                                  <div className="text-sm font-medium leading-none text-white whitespace-nowrap">
                                    Text to Image
                                  </div>
                                </Link>
                              </NavigationMenuLink>
                              <NavigationMenuLink asChild>
                                <Link
                                  href="/image-to-image"
                                  className="block select-none rounded-md px-3 py-2 leading-none no-underline outline-none transition-colors hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                                >
                                  <div className="text-sm font-medium leading-none text-white whitespace-nowrap">
                                    Image to Image
                                  </div>
                                </Link>
                              </NavigationMenuLink>
                            </div>
                          </div>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>

                <Link
                  href="/pricing"
                  className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-300 ease-apple"
                >
                  Pricing
                </Link>

                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-300 ease-apple bg-transparent hover:bg-white/10 data-[state=open]:!bg-white/10 data-[active]:!bg-white/10 focus:!bg-white/10">
                        Support
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="grid w-[120px] gap-1 p-2 bg-black/95 backdrop-blur-lg border border-white/10 rounded-lg">
                          <NavigationMenuLink asChild>
                            <Link
                              href="/about"
                              className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                            >
                              <div className="text-sm font-medium leading-none text-white">About</div>
                            </Link>
                          </NavigationMenuLink>
                          <NavigationMenuLink asChild>
                            <Link
                              href="/contact"
                              className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                            >
                              <div className="text-sm font-medium leading-none text-white">Contact</div>
                            </Link>
                          </NavigationMenuLink>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
              </>
            )}
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            {/* 为加载状态提供稳定的布局，避免重叠 */}
            {status === "loading" ? (
              // 加载时显示占位符，保持布局稳定
              <div className="flex items-center space-x-4 opacity-50">
                <div className="w-24 h-10 bg-gray-700 rounded animate-pulse"></div>
                <div className="w-20 h-10 bg-gray-700 rounded animate-pulse"></div>
              </div>
            ) : session?.user ? (
              <>
                {shouldShowStartButton && <GetStartedButton key="start-btn-auth" text={buttonText} />}
                <CreditsDisplaySimple />
                <UserMenu />
              </>
            ) : (
              <>
                {shouldShowStartButton && <GetStartedButton key="start-btn-unauth" text={buttonText} />}
                <Button
                  variant="outline"
                  className="hover:border-brand-purple-DEFAULT hover:text-brand-purple-DEFAULT transition-all duration-300 ease-apple hover:shadow-apple-soft group"
                  asChild
                >
                  <Link href="/login">
                    <LogIn className="h-4 w-4 mr-2 group-hover:text-brand-purple-DEFAULT transition-colors duration-300" />
                    Sign In
                  </Link>
                </Button>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="h-6 w-6 text-white" /> : <Menu className="h-6 w-6 text-white" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-lg">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {!isCreatePage && (
              <>
                <Link
                  href="/"
                  className="block py-2 text-base font-heading text-gray-200 hover:text-white transition-colors duration-300"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>

                {/* AI Studio Section */}
                <div className="space-y-3 border border-white/10 rounded-lg p-3">
                  <div className="text-base font-heading text-white font-medium">AI Studio</div>

                  {/* AI Video */}
                  <div className="space-y-2">
                    <div className="text-xs uppercase font-semibold text-gray-400 tracking-wider">AI Video</div>
                    <div className="ml-3 space-y-1">
                      <Link
                        href="/text-to-video"
                        className="block py-2 text-sm text-gray-200 hover:text-brand-purple-DEFAULT transition-colors duration-300"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Text to Video
                      </Link>
                      <Link
                        href="/image-to-video"
                        className="block py-2 text-sm text-gray-200 hover:text-brand-purple-DEFAULT transition-colors duration-300"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Image to Video
                      </Link>
                      <Link
                        href="/ai-video-effects"
                        className="block py-2 text-sm text-gray-200 hover:text-brand-purple-DEFAULT transition-colors duration-300"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        AI Video Effects
                      </Link>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                  {/* AI Image */}
                  <div className="space-y-2">
                    <div className="text-xs uppercase font-semibold text-gray-400 tracking-wider">AI Image</div>
                    <div className="ml-3 space-y-1">
                      <Link
                        href="/text-to-image"
                        className="block py-2 text-sm text-gray-200 hover:text-brand-pink-DEFAULT transition-colors duration-300"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Text to Image
                      </Link>
                      <Link
                        href="/image-to-image"
                        className="block py-2 text-sm text-gray-200 hover:text-brand-pink-DEFAULT transition-colors duration-300"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Image to Image
                      </Link>
                    </div>
                  </div>
                </div>

                <Link
                  href="/pricing"
                  className="block py-2 text-base font-heading text-gray-200 hover:text-white transition-colors duration-300"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </Link>

                {/* Support Section */}
                <div className="space-y-2">
                  <div className="py-2 text-base font-heading text-white font-medium">Support</div>
                  <div className="ml-4 space-y-2">
                    <Link
                      href="/about"
                      className="block py-2 text-sm text-gray-200 hover:text-brand-purple-DEFAULT transition-colors duration-300"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      About
                    </Link>
                    <Link
                      href="/contact"
                      className="block py-2 text-sm text-gray-200 hover:text-brand-purple-DEFAULT transition-colors duration-300"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Contact
                    </Link>
                  </div>
                </div>
              </>
            )}
            <div className="pt-4 flex flex-col space-y-4">
              {/* 移动端也需要稳定的加载布局 */}
              {status === "loading" ? (
                <div className="flex flex-col space-y-4 opacity-50">
                  <div className="w-32 h-10 bg-gray-700 rounded animate-pulse"></div>
                  <div className="w-24 h-8 bg-gray-700 rounded animate-pulse"></div>
                </div>
              ) : session?.user ? (
                <>
                  {shouldShowStartButton && <GetStartedButton key="start-btn-mobile-auth" text={buttonText} />}
                  <CreditsDisplaySimple />
                  <div className="flex items-center space-x-3 p-2">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 flex items-center justify-center text-white font-medium">
                      {session.user.name?.[0] || session.user.email?.[0] || "U"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{session.user.name || "User"}</p>
                      <p className="text-xs text-gray-400">{session.user.email}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {shouldShowStartButton && <GetStartedButton key="start-btn-mobile-unauth" text={buttonText} />}
                  <Button
                    variant="ghost"
                    className="text-gray-200 justify-start group font-heading hover:text-brand-purple-DEFAULT transition-colors duration-300"
                    asChild
                  >
                    <Link href="/login">Sign In</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
