"use client"

import { useState, useEffect } from 'react'
import { getBlackFridayEndDate } from '@/lib/black-friday/coupons'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function BlackFridayCountdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const endDate = getBlackFridayEndDate()
    if (!endDate) return

    const calculateTimeLeft = (): TimeLeft => {
      const now = Date.now()
      const end = endDate.getTime()
      const difference = end - now

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 }
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      }
    }

    // 初始计算
    setTimeLeft(calculateTimeLeft())

    // 每秒更新
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [mounted])

  if (!mounted || !timeLeft) {
    return null
  }

  // 如果倒计时结束
  if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
    return (
      <div className="text-center">
        <p className="text-xl font-bold text-red-500">Sale Ended</p>
      </div>
    )
  }

  const timeUnits = [
    { value: timeLeft.days, label: 'Days' },
    { value: timeLeft.hours, label: 'Hours' },
    { value: timeLeft.minutes, label: 'Minutes' },
    { value: timeLeft.seconds, label: 'Seconds' }
  ]

  return (
    <div className="flex items-center justify-center gap-3 md:gap-6">
      {timeUnits.map((unit, index) => (
        <div key={unit.label} className="flex items-center gap-3 md:gap-6">
          <div className="flex flex-col items-center">
            <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-lg p-3 md:p-4 min-w-[60px] md:min-w-[80px] shadow-lg">
              <span className="text-2xl md:text-4xl font-bold text-white tabular-nums">
                {String(unit.value).padStart(2, '0')}
              </span>
            </div>
            <span className="text-xs md:text-sm text-gray-400 mt-2 font-medium">
              {unit.label}
            </span>
          </div>
          {index < timeUnits.length - 1 && (
            <span className="text-2xl md:text-3xl font-bold text-gray-600">:</span>
          )}
        </div>
      ))}
    </div>
  )
}
