import { useEffect, useState, useRef } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { useAccount } from '@/hooks/useAccount'
import { supabase } from '@/lib/supabase'
import { TRADER_NAV } from '@/lib/nav'

/* ── SVG generators ───────────────────────────────────────────────── */
function buildFundedSVG(data: {
  name: string
  accountNumber: string
  accountSize: number
  challengeType: string
  fundedAt: string
  certId: string
}): string {
  const { name, accountNumber, accountSize, challengeType, fundedAt, certId } = data
  const size  = `$${Number(accountSize).toLocaleString()}`
  const type  = challengeType === '1step' ? '1-Step' : '2-Step'
  const date  = new Date(fundedAt).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })
  const [day, ...rest] = date.split(' ')
  const dateL1 = `${day} ${rest[0]}`
  const dateL2 = rest[1]

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 480" width="1360" height="960">
  <defs>
    <linearGradient id="bgFF" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0A0F1E"/>
      <stop offset="60%" stop-color="#0D1530"/>
      <stop offset="100%" stop-color="#0A0F1E"/>
    </linearGradient>
    <linearGradient id="gldF" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7A5C10"/>
      <stop offset="25%" stop-color="#D4A843"/>
      <stop offset="50%" stop-color="#F5D878"/>
      <stop offset="75%" stop-color="#D4A843"/>
      <stop offset="100%" stop-color="#7A5C10"/>
    </linearGradient>
    <linearGradient id="gldVF" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F5D878"/>
      <stop offset="100%" stop-color="#A07020"/>
    </linearGradient>
    <linearGradient id="fadeF" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#D4A843" stop-opacity="0"/>
      <stop offset="20%" stop-color="#D4A843" stop-opacity="0.7"/>
      <stop offset="80%" stop-color="#D4A843" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#D4A843" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="sideF" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#D4A843" stop-opacity="0"/>
      <stop offset="30%" stop-color="#D4A843" stop-opacity="0.4"/>
      <stop offset="70%" stop-color="#D4A843" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#D4A843" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="statF" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#D4A843" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#D4A843" stop-opacity="0.03"/>
    </linearGradient>
  </defs>
  <rect width="680" height="480" fill="url(#bgFF)" rx="10"/>
  <rect x="60" y="68" width="560" height="346" fill="#0D1840" rx="6" opacity="0.45"/>
  <rect x="14" y="14" width="652" height="452" fill="none" stroke="url(#gldF)" stroke-width="1.5" rx="8"/>
  <rect x="26" y="26" width="628" height="428" fill="none" stroke="#D4A843" stroke-width="0.4" rx="5" opacity="0.22"/>
  <rect x="14" y="14" width="652" height="56" fill="#D4A843" fill-opacity="0.07" rx="8"/>
  <rect x="14" y="68" width="652" height="1" fill="url(#gldF)" opacity="0.5"/>
  <rect x="14" y="14" width="652" height="1.5" fill="url(#gldF)"/>
  <rect x="14" y="428" width="652" height="38" fill="#D4A843" fill-opacity="0.07" rx="8"/>
  <rect x="14" y="428" width="652" height="1" fill="url(#gldF)" opacity="0.5"/>
  <rect x="14" y="464" width="652" height="1.5" fill="url(#gldF)"/>
  <rect x="60" y="68" width="2" height="346" fill="url(#sideF)" rx="1"/>
  <rect x="618" y="68" width="2" height="346" fill="url(#sideF)" rx="1"/>
  <polygon points="26,26 40,33 33,40 26,26" fill="#D4A843" opacity="0.5"/>
  <circle cx="26" cy="26" r="4" fill="#D4A843" opacity="0.28"/>
  <polygon points="654,26 640,33 647,40 654,26" fill="#D4A843" opacity="0.5"/>
  <circle cx="654" cy="26" r="4" fill="#D4A843" opacity="0.28"/>
  <polygon points="26,454 40,447 33,440 26,454" fill="#D4A843" opacity="0.5"/>
  <circle cx="26" cy="454" r="4" fill="#D4A843" opacity="0.28"/>
  <polygon points="654,454 640,447 647,440 654,454" fill="#D4A843" opacity="0.5"/>
  <circle cx="654" cy="454" r="4" fill="#D4A843" opacity="0.28"/>
  <polygon points="340,18 347,29 340,33 333,29" fill="#D4A843" opacity="0.65"/>
  <line x1="200" y1="27" x2="327" y2="27" stroke="#D4A843" stroke-width="0.5" opacity="0.3"/>
  <line x1="353" y1="27" x2="480" y2="27" stroke="#D4A843" stroke-width="0.5" opacity="0.3"/>
  <text x="340" y="44" font-family="Georgia, serif" font-size="9" fill="#F5D878" text-anchor="middle" letter-spacing="5" opacity="0.95">CERTIFICATE  OF  ACHIEVEMENT</text>
  <line x1="100" y1="44" x2="175" y2="44" stroke="#D4A843" stroke-width="0.6" opacity="0.35"/>
  <line x1="505" y1="44" x2="580" y2="44" stroke="#D4A843" stroke-width="0.6" opacity="0.35"/>
  <circle cx="92" cy="44" r="2" fill="#D4A843" opacity="0.4"/>
  <circle cx="588" cy="44" r="2" fill="#D4A843" opacity="0.4"/>
  <text x="340" y="106" font-family="Georgia, serif" font-size="25" fill="#FFFFFF" text-anchor="middle" font-weight="700">The Funded <tspan fill="url(#gldVF)" font-style="italic">Diaries</tspan></text>
  <text x="340" y="125" font-family="Georgia, serif" font-size="7.5" fill="#D4A843" text-anchor="middle" letter-spacing="4" opacity="0.55">PROPRIETARY TRADING FIRM  ·  EST. 2025</text>
  <rect x="80" y="136" width="520" height="0.8" fill="url(#fadeF)" opacity="0.6"/>
  <rect x="220" y="140" width="240" height="0.4" fill="url(#fadeF)" opacity="0.28"/>
  <text x="340" y="170" font-family="Georgia, serif" font-size="10.5" fill="#8FA3BF" text-anchor="middle" letter-spacing="3" opacity="0.8">THIS CERTIFIES THAT</text>
  <text x="340" y="212" font-family="Georgia, serif" font-size="34" fill="url(#gldF)" text-anchor="middle" font-weight="700" letter-spacing="1">${name}</text>
  <rect x="110" y="222" width="460" height="0.9" fill="url(#fadeF)"/>
  <rect x="200" y="226" width="280" height="0.4" fill="url(#fadeF)" opacity="0.32"/>
  <text x="340" y="256" font-family="Georgia, serif" font-size="11" fill="#B0C4DE" text-anchor="middle" opacity="0.82">has successfully completed the evaluation programme and has been awarded</text>
  <text x="340" y="278" font-family="Georgia, serif" font-size="16" fill="#FFFFFF" text-anchor="middle" font-weight="700" letter-spacing="2">a Fully Funded Trading Account</text>
  <rect x="88" y="298" width="148" height="62" fill="url(#statF)" rx="5"/>
  <rect x="88" y="298" width="148" height="62" fill="none" stroke="#D4A843" stroke-width="0.6" rx="5" opacity="0.35"/>
  <rect x="88" y="298" width="148" height="3" fill="url(#gldF)" rx="2" opacity="0.7"/>
  <text x="162" y="318" font-family="Georgia, serif" font-size="7.5" fill="#D4A843" text-anchor="middle" letter-spacing="2" opacity="0.8">ACCOUNT SIZE</text>
  <text x="162" y="344" font-family="Georgia, serif" font-size="21" fill="#FFFFFF" text-anchor="middle" font-weight="700">${size}</text>
  <rect x="266" y="298" width="148" height="62" fill="url(#statF)" rx="5"/>
  <rect x="266" y="298" width="148" height="62" fill="none" stroke="#D4A843" stroke-width="0.6" rx="5" opacity="0.35"/>
  <rect x="266" y="298" width="148" height="3" fill="url(#gldF)" rx="2" opacity="0.7"/>
  <text x="340" y="318" font-family="Georgia, serif" font-size="7.5" fill="#D4A843" text-anchor="middle" letter-spacing="2" opacity="0.8">CHALLENGE TYPE</text>
  <text x="340" y="336" font-family="Georgia, serif" font-size="13" fill="#FFFFFF" text-anchor="middle" font-weight="700">${type}-Step</text>
  <text x="340" y="352" font-family="Georgia, serif" font-size="10.5" fill="#FFFFFF" text-anchor="middle" opacity="0.7">Evaluation</text>
  <rect x="444" y="298" width="148" height="62" fill="url(#statF)" rx="5"/>
  <rect x="444" y="298" width="148" height="62" fill="none" stroke="#D4A843" stroke-width="0.6" rx="5" opacity="0.35"/>
  <rect x="444" y="298" width="148" height="3" fill="url(#gldF)" rx="2" opacity="0.7"/>
  <text x="518" y="318" font-family="Georgia, serif" font-size="7.5" fill="#D4A843" text-anchor="middle" letter-spacing="2" opacity="0.8">DATE AWARDED</text>
  <text x="518" y="338" font-family="Georgia, serif" font-size="14" fill="#FFFFFF" text-anchor="middle" font-weight="700">${dateL1}</text>
  <text x="518" y="354" font-family="Georgia, serif" font-size="12" fill="#FFFFFF" text-anchor="middle" opacity="0.75">${dateL2}</text>
  <rect x="80" y="376" width="520" height="0.8" fill="url(#fadeF)" opacity="0.45"/>
  <text x="160" y="408" font-family="Palatino Linotype, Palatino, Book Antiqua, Georgia, serif" font-size="19" fill="#D4A843" text-anchor="middle" font-style="italic" opacity="0.92" letter-spacing="2">Cristian</text>
  <path d="M108,413 C128,410 158,409 212,413" stroke="#D4A843" stroke-width="0.7" stroke-linecap="round" fill="none" opacity="0.38"/>
  <text x="160" y="432" font-family="Georgia, serif" font-size="7.5" fill="#D4A843" text-anchor="middle" letter-spacing="2" opacity="0.6">CHIEF EXECUTIVE OFFICER</text>
  <circle cx="340" cy="416" r="24" fill="none" stroke="#D4A843" stroke-width="0.7" opacity="0.28"/>
  <circle cx="340" cy="416" r="17" fill="#D4A843" fill-opacity="0.05"/>
  <circle cx="340" cy="416" r="10" fill="none" stroke="#D4A843" stroke-width="0.4" opacity="0.2"/>
  <text x="340" y="413" font-family="Georgia, serif" font-size="7" fill="#D4A843" text-anchor="middle" opacity="0.65" letter-spacing="1">TFD</text>
  <text x="340" y="424" font-family="Georgia, serif" font-size="5" fill="#D4A843" text-anchor="middle" opacity="0.4">SEAL</text>
  <text x="510" y="403" font-family="Georgia, serif" font-size="7.5" fill="#8FA3BF" text-anchor="middle" letter-spacing="1" opacity="0.55">CERTIFICATE ID</text>
  <text x="510" y="417" font-family="Georgia, serif" font-size="11" fill="#D4A843" text-anchor="middle" font-weight="700" letter-spacing="1" opacity="0.9">${certId}</text>
  <text x="510" y="431" font-family="Georgia, serif" font-size="7.5" fill="#8FA3BF" text-anchor="middle" opacity="0.42">thefundeddiaries.com</text>
  <text x="340" y="457" font-family="Georgia, serif" font-size="7" fill="#D4A843" text-anchor="middle" letter-spacing="3" opacity="0.32">THE FUNDED DIARIES  ·  ALL RIGHTS RESERVED</text>
</svg>`
}

function buildPayoutSVG(data: {
  name: string
  accountNumber: string
  grossProfit: number
  split: number
  netAmount: number
  paidAt: string
  certId: string
}): string {
  const { name, accountNumber, grossProfit, split, netAmount, paidAt, certId } = data
  const date = new Date(paidAt).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })
  const fmtUSD = (n: number) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 480" width="1360" height="960">
  <defs>
    <linearGradient id="bgPF" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0F0A00"/>
      <stop offset="60%" stop-color="#1A1200"/>
      <stop offset="100%" stop-color="#0F0A00"/>
    </linearGradient>
    <linearGradient id="gldP" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7A5C10"/>
      <stop offset="25%" stop-color="#D4A843"/>
      <stop offset="50%" stop-color="#F5D878"/>
      <stop offset="75%" stop-color="#D4A843"/>
      <stop offset="100%" stop-color="#7A5C10"/>
    </linearGradient>
    <linearGradient id="gldVP" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F5D878"/>
      <stop offset="100%" stop-color="#9A6E10"/>
    </linearGradient>
    <linearGradient id="fadeP" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#D4A843" stop-opacity="0"/>
      <stop offset="20%" stop-color="#D4A843" stop-opacity="0.7"/>
      <stop offset="80%" stop-color="#D4A843" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#D4A843" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="sideP" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#D4A843" stop-opacity="0"/>
      <stop offset="30%" stop-color="#D4A843" stop-opacity="0.35"/>
      <stop offset="70%" stop-color="#D4A843" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#D4A843" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="amP" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#D4A843" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#D4A843" stop-opacity="0.04"/>
    </linearGradient>
    <linearGradient id="statP" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#D4A843" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#D4A843" stop-opacity="0.03"/>
    </linearGradient>
  </defs>
  <rect width="680" height="480" fill="url(#bgPF)" rx="10"/>
  <rect x="60" y="68" width="560" height="346" fill="#1A1400" rx="6" opacity="0.5"/>
  <rect x="14" y="14" width="652" height="452" fill="none" stroke="url(#gldP)" stroke-width="1.5" rx="8"/>
  <rect x="26" y="26" width="628" height="428" fill="none" stroke="#D4A843" stroke-width="0.4" rx="5" opacity="0.22"/>
  <rect x="14" y="14" width="652" height="56" fill="#D4A843" fill-opacity="0.07" rx="8"/>
  <rect x="14" y="68" width="652" height="1" fill="url(#gldP)" opacity="0.5"/>
  <rect x="14" y="14" width="652" height="1.5" fill="url(#gldP)"/>
  <rect x="14" y="428" width="652" height="38" fill="#D4A843" fill-opacity="0.07" rx="8"/>
  <rect x="14" y="428" width="652" height="1" fill="url(#gldP)" opacity="0.5"/>
  <rect x="14" y="464" width="652" height="1.5" fill="url(#gldP)"/>
  <rect x="60" y="68" width="2" height="346" fill="url(#sideP)" rx="1"/>
  <rect x="618" y="68" width="2" height="346" fill="url(#sideP)" rx="1"/>
  <polygon points="26,26 40,33 33,40 26,26" fill="#D4A843" opacity="0.5"/>
  <circle cx="26" cy="26" r="4" fill="#D4A843" opacity="0.28"/>
  <polygon points="654,26 640,33 647,40 654,26" fill="#D4A843" opacity="0.5"/>
  <circle cx="654" cy="26" r="4" fill="#D4A843" opacity="0.28"/>
  <polygon points="26,454 40,447 33,440 26,454" fill="#D4A843" opacity="0.5"/>
  <circle cx="26" cy="454" r="4" fill="#D4A843" opacity="0.28"/>
  <polygon points="654,454 640,447 647,440 654,454" fill="#D4A843" opacity="0.5"/>
  <circle cx="654" cy="454" r="4" fill="#D4A843" opacity="0.28"/>
  <polygon points="340,18 347,29 340,33 333,29" fill="#D4A843" opacity="0.65"/>
  <line x1="200" y1="27" x2="327" y2="27" stroke="#D4A843" stroke-width="0.5" opacity="0.3"/>
  <line x1="353" y1="27" x2="480" y2="27" stroke="#D4A843" stroke-width="0.5" opacity="0.3"/>
  <text x="340" y="44" font-family="Georgia, serif" font-size="9" fill="#F5D878" text-anchor="middle" letter-spacing="5" opacity="0.95">PROFIT  WITHDRAWAL  CERTIFICATE</text>
  <line x1="100" y1="44" x2="168" y2="44" stroke="#D4A843" stroke-width="0.6" opacity="0.35"/>
  <line x1="512" y1="44" x2="580" y2="44" stroke="#D4A843" stroke-width="0.6" opacity="0.35"/>
  <circle cx="92" cy="44" r="2" fill="#D4A843" opacity="0.4"/>
  <circle cx="588" cy="44" r="2" fill="#D4A843" opacity="0.4"/>
  <text x="340" y="106" font-family="Georgia, serif" font-size="25" fill="#FFFFFF" text-anchor="middle" font-weight="700">The Funded <tspan fill="url(#gldVP)" font-style="italic">Diaries</tspan></text>
  <text x="340" y="125" font-family="Georgia, serif" font-size="7.5" fill="#D4A843" text-anchor="middle" letter-spacing="4" opacity="0.55">PROPRIETARY TRADING FIRM  ·  EST. 2025</text>
  <rect x="80" y="136" width="520" height="0.8" fill="url(#fadeP)" opacity="0.6"/>
  <rect x="220" y="140" width="240" height="0.4" fill="url(#fadeP)" opacity="0.28"/>
  <text x="340" y="170" font-family="Georgia, serif" font-size="10.5" fill="#C8A84A" text-anchor="middle" letter-spacing="3" opacity="0.8">CONGRATULATIONS TO</text>
  <text x="340" y="210" font-family="Georgia, serif" font-size="34" fill="url(#gldP)" text-anchor="middle" font-weight="700" letter-spacing="1">${name}</text>
  <rect x="110" y="220" width="460" height="0.9" fill="url(#fadeP)"/>
  <rect x="200" y="224" width="280" height="0.4" fill="url(#fadeP)" opacity="0.32"/>
  <text x="340" y="253" font-family="Georgia, serif" font-size="11" fill="#C8A060" text-anchor="middle" opacity="0.78">has successfully withdrawn profits from funded account</text>
  <text x="340" y="272" font-family="Georgia, serif" font-size="13" fill="#FFFFFF" text-anchor="middle" font-weight="700" letter-spacing="2">${accountNumber}</text>
  <rect x="190" y="288" width="300" height="70" fill="url(#amP)" rx="6"/>
  <rect x="190" y="288" width="300" height="70" fill="none" stroke="url(#gldP)" stroke-width="0.8" rx="6" opacity="0.5"/>
  <rect x="190" y="288" width="300" height="3" fill="url(#gldP)" rx="2" opacity="0.8"/>
  <text x="340" y="310" font-family="Georgia, serif" font-size="8" fill="#D4A843" text-anchor="middle" letter-spacing="4" opacity="0.85">AMOUNT RECEIVED</text>
  <text x="340" y="344" font-family="Georgia, serif" font-size="36" fill="url(#gldVP)" text-anchor="middle" font-weight="700">${fmtUSD(netAmount)}</text>
  <rect x="90" y="374" width="148" height="48" fill="url(#statP)" rx="4"/>
  <rect x="90" y="374" width="148" height="48" fill="none" stroke="#D4A843" stroke-width="0.5" rx="4" opacity="0.28"/>
  <text x="164" y="391" font-family="Georgia, serif" font-size="7.5" fill="#D4A843" text-anchor="middle" letter-spacing="2" opacity="0.75">GROSS PROFIT</text>
  <text x="164" y="410" font-family="Georgia, serif" font-size="16" fill="#FFFFFF" text-anchor="middle" font-weight="700">${fmtUSD(grossProfit)}</text>
  <rect x="266" y="374" width="148" height="48" fill="url(#statP)" rx="4"/>
  <rect x="266" y="374" width="148" height="48" fill="none" stroke="#D4A843" stroke-width="0.5" rx="4" opacity="0.28"/>
  <text x="340" y="391" font-family="Georgia, serif" font-size="7.5" fill="#D4A843" text-anchor="middle" letter-spacing="2" opacity="0.75">PROFIT SPLIT</text>
  <text x="340" y="410" font-family="Georgia, serif" font-size="16" fill="#FFFFFF" text-anchor="middle" font-weight="700">${split}%</text>
  <rect x="442" y="374" width="148" height="48" fill="url(#statP)" rx="4"/>
  <rect x="442" y="374" width="148" height="48" fill="none" stroke="#D4A843" stroke-width="0.5" rx="4" opacity="0.28"/>
  <text x="516" y="391" font-family="Georgia, serif" font-size="7.5" fill="#D4A843" text-anchor="middle" letter-spacing="2" opacity="0.75">DATE PAID</text>
  <text x="516" y="406" font-family="Georgia, serif" font-size="13" fill="#FFFFFF" text-anchor="middle" font-weight="700">${date}</text>
  <rect x="80" y="436" width="520" height="0.8" fill="url(#fadeP)" opacity="0.45"/>
  <text x="160" y="455" font-family="Palatino Linotype, Palatino, Book Antiqua, Georgia, serif" font-size="19" fill="#D4A843" text-anchor="middle" font-style="italic" opacity="0.92" letter-spacing="2">Cristian</text>
  <path d="M108,460 C128,457 158,456 212,460" stroke="#D4A843" stroke-width="0.7" stroke-linecap="round" fill="none" opacity="0.38"/>
  <text x="160" y="474" font-family="Georgia, serif" font-size="7.5" fill="#D4A843" text-anchor="middle" letter-spacing="2" opacity="0.6">CHIEF EXECUTIVE OFFICER</text>
  <circle cx="340" cy="456" r="20" fill="none" stroke="#D4A843" stroke-width="0.7" opacity="0.28"/>
  <circle cx="340" cy="456" r="14" fill="#D4A843" fill-opacity="0.05"/>
  <circle cx="340" cy="456" r="8" fill="none" stroke="#D4A843" stroke-width="0.4" opacity="0.2"/>
  <text x="340" y="453" font-family="Georgia, serif" font-size="7" fill="#D4A843" text-anchor="middle" opacity="0.65" letter-spacing="1">TFD</text>
  <text x="340" y="463" font-family="Georgia, serif" font-size="5" fill="#D4A843" text-anchor="middle" opacity="0.4">SEAL</text>
  <text x="510" y="448" font-family="Georgia, serif" font-size="7.5" fill="#8FA3BF" text-anchor="middle" letter-spacing="1" opacity="0.55">CERTIFICATE ID</text>
  <text x="510" y="461" font-family="Georgia, serif" font-size="11" fill="#D4A843" text-anchor="middle" font-weight="700" letter-spacing="1" opacity="0.9">${certId}</text>
  <text x="510" y="474" font-family="Georgia, serif" font-size="7.5" fill="#8FA3BF" text-anchor="middle" opacity="0.42">thefundeddiaries.com</text>
  <text x="340" y="476" font-family="Georgia, serif" font-size="7" fill="#D4A843" text-anchor="middle" letter-spacing="3" opacity="0.32">THE FUNDED DIARIES  ·  ALL RIGHTS RESERVED</text>
</svg>`
}

/* ── Download helpers ─────────────────────────────────────────────── */
function downloadSVGasPNG(svgString: string, filename: string) {
  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  const url  = URL.createObjectURL(blob)
  const img  = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width  = 1360
    canvas.height = 960
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)
    canvas.toBlob(b => {
      if (!b) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(b)
      a.download = filename
      a.click()
    }, 'image/png')
  }
  img.src = url
}

function downloadSVGasPDF(svgString: string, filename: string) {
  // Render to canvas then use jsPDF-like approach via data URL
  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  const url  = URL.createObjectURL(blob)
  const img  = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width  = 1360
    canvas.height = 960
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
    // Build minimal PDF with embedded JPEG
    const pdfContent = buildPDF(dataUrl, 1360, 960)
    const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(pdfBlob)
    a.download = filename
    a.click()
  }
  img.src = url
}

function buildPDF(jpegDataUrl: string, w: number, h: number): Uint8Array {
  const jpegData = atob(jpegDataUrl.split(',')[1])
  const jpegBytes = new Uint8Array(jpegData.length)
  for (let i = 0; i < jpegData.length; i++) jpegBytes[i] = jpegData.charCodeAt(i)
  const enc = new TextEncoder()
  // A4 landscape in points: 842 x 595
  const pw = 842, ph = 595
  const imgObj = `1 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  const imgEnd = `\nendstream\nendobj\n`
  const pageObj = `2 0 obj\n<< /Type /Page /Parent 3 0 R /MediaBox [0 0 ${pw} ${ph}] /Contents 4 0 R /Resources << /XObject << /Im1 1 0 R >> >> >>\nendobj\n`
  const contentStream = `q ${pw} 0 0 ${ph} 0 0 cm /Im1 Do Q`
  const enc4 = enc.encode(contentStream)
  const contentObj = `4 0 obj\n<< /Length ${enc4.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`
  const pagesObj  = `3 0 obj\n<< /Type /Pages /Kids [2 0 R] /Count 1 >>\nendobj\n`
  const catalogObj = `5 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj\n`
  const header = `%PDF-1.4\n`
  const imgObjFull = imgObj + String.fromCharCode(...jpegBytes) + imgEnd
  const body = imgObjFull + pageObj + pagesObj + contentObj + catalogObj
  const xrefPos = (header + body).length
  const xref = `xref\n0 6\n0000000000 65535 f \n${String(header.length).padStart(10,'0')} 00000 n \n0000000000 65535 f \n0000000000 65535 f \n0000000000 65535 f \n0000000000 65535 f \n`
  const trailer = `trailer\n<< /Size 6 /Root 5 0 R >>\nstartxref\n${xrefPos}\n%%EOF`
  const full = header + body + xref + trailer
  return enc.encode(full)
}

/* ── Certificate card component ──────────────────────────────────── */
function CertCard({ title, subtitle, svgString, filename, icon }: {
  title: string; subtitle: string; svgString: string; filename: string; icon: string
}) {
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (previewRef.current && svgString) {
      previewRef.current.innerHTML = svgString
      const svg = previewRef.current.querySelector('svg')
      if (svg) {
        svg.setAttribute('width', '100%')
        svg.setAttribute('height', '100%')
        svg.removeAttribute('width')
        svg.removeAttribute('height')
        svg.style.display = 'block'
      }
    }
  }, [svgString])

  return (
    <div style={{ background:'#fff', border:'1px solid #E8EEF8', borderRadius:'12px', overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
      {/* Preview */}
      <div ref={previewRef} style={{ width:'100%', aspectRatio:'680/480', background:'#0A0F1E', overflow:'hidden' }}/>
      {/* Info + actions */}
      <div style={{ padding:'16px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px' }}>
          <span style={{ fontSize:'20px' }}>{icon}</span>
          <div>
            <div style={{ fontSize:'13px', fontWeight:700, color:'#1A3A6B' }}>{title}</div>
            <div style={{ fontSize:'11px', color:'#8FA3BF', marginTop:'1px' }}>{subtitle}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:'8px', marginTop:'14px' }}>
          <button
            onClick={() => downloadSVGasPNG(svgString, `${filename}.png`)}
            style={{ flex:1, padding:'9px', fontSize:'11px', fontWeight:700, background:'#1A3A6B', color:'#fff', border:'none', borderRadius:'7px', cursor:'pointer', letterSpacing:'0.5px' }}>
            ↓ Download PNG
          </button>
          <button
            onClick={() => downloadSVGasPDF(svgString, `${filename}.pdf`)}
            style={{ flex:1, padding:'9px', fontSize:'11px', fontWeight:700, background:'#F4F7FD', color:'#1A3A6B', border:'1px solid #E8EEF8', borderRadius:'7px', cursor:'pointer', letterSpacing:'0.5px' }}>
            ↓ Download PDF
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main page ────────────────────────────────────────────────────── */
export function CertificatesPage() {
  const { toasts, dismiss } = useToast()
  const { accounts } = useAccount()
  const [certs, setCerts] = useState<{ type:string; svg:string; title:string; subtitle:string; filename:string; icon:string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (accounts.length === 0) return
    buildCertificates()
  }, [accounts])

  async function buildCertificates() {
    setLoading(true)
    const result: typeof certs = []
    const year = new Date().getFullYear()

    // Fetch real user profile — useAccount doesn't include users join
    let name = 'Trader'
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser?.id) {
        const { data: profile } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', authUser.id)
          .single()
        if (profile?.first_name) {
          name = `${profile.first_name} ${profile.last_name ?? ''}`.trim()
        }
      }
    } catch {}

    for (const account of accounts) {
      const prod   = (account as any).challenge_products
      const split  = prod?.funded_profit_split ?? 80
      const size   = account.starting_balance
      const cType  = prod?.challenge_type ?? '2step'

      // Funded certificate — only if phase is funded or passed
      const fundedDate = account.funded_at ?? account.purchased_at ?? account.created_at
      if ((account.phase === 'funded' || account.phase === 'passed') && fundedDate) {
        const certId = `TFD-F-${year}-${account.account_number.replace('TFD-','').replace(/-/g,'').slice(-4)}`
        result.push({
          type: 'funded',
          icon: '🏆',
          title: `Funded Trader — ${account.account_number}`,
          subtitle: `$${Number(size).toLocaleString()} · ${cType === '1step' ? '1-Step' : '2-Step'} Evaluation`,
          filename: `TFD-Funded-Certificate-${account.account_number}`,
          svg: buildFundedSVG({ name, accountNumber: account.account_number, accountSize: size, challengeType: cType, fundedAt: fundedDate, certId }),
        })
      }
    }

    // Payout certificates — fetch all paid payouts
    const accountIds = accounts.map(a => a.id)
    if (accountIds.length > 0) {
      const { data: payouts } = await supabase
        .from('payouts')
        .select('*, accounts(account_number, starting_balance, challenge_products(funded_profit_split))')
        .in('account_id', accountIds)
        .eq('status', 'paid')
        .order('updated_at', { ascending: false })

      // name already fetched above from auth profile

      let payoutIdx = 1
      for (const p of payouts ?? []) {
        const acc     = p.accounts as any
        const split   = acc?.challenge_products?.funded_profit_split ?? 80
        const net     = p.requested_usd ?? 0
        const gross   = split > 0 ? +(net / split * 100).toFixed(2) : net
        const paidAt  = p.updated_at ?? p.created_at
        const certId  = `TFD-P-${year}-${String(payoutIdx).padStart(4,'0')}`
        payoutIdx++
        result.push({
          type: 'payout',
          icon: '💰',
          title: `Profit Withdrawal #${payoutIdx - 1}`,
          subtitle: `${acc?.account_number} · $${net.toFixed(2)} received`,
          filename: `TFD-Payout-Certificate-${acc?.account_number}-${payoutIdx-1}`,
          svg: buildPayoutSVG({ name, accountNumber: acc?.account_number ?? '—', grossProfit: gross, split, netAmount: net, paidAt, certId }),
        })
      }
    }

    setCerts(result)
    setLoading(false)
  }

  return (
    <>
      <DashboardLayout title="My Certificates" nav={TRADER_NAV} accentColor="gold">
        <div style={{ marginBottom:'20px' }}>
          <div style={{ fontSize:'13px', color:'#5C7A9E', lineHeight:1.6 }}>
            Your achievement certificates are generated automatically. Download them as PNG or PDF to share your milestones.
          </div>
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'60px' }}>
            <div style={{ width:'32px', height:'32px', border:'2px solid #2255CC', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          </div>
        ) : certs.length === 0 ? (
          <div style={{ background:'#fff', border:'1px solid #E8EEF8', borderRadius:'12px', padding:'60px 24px', textAlign:'center' }}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>🏆</div>
            <div style={{ fontSize:'16px', fontWeight:700, color:'#1A3A6B', marginBottom:'8px' }}>No certificates yet</div>
            <p style={{ fontSize:'13px', color:'#8FA3BF', maxWidth:'400px', margin:'0 auto' }}>
              Certificates are issued automatically when you pass an evaluation and receive a funded account, or when a payout is processed.
            </p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(420px, 1fr))', gap:'20px' }}>
            {certs.map((c, i) => (
              <CertCard key={i} title={c.title} subtitle={c.subtitle} svgString={c.svg} filename={c.filename} icon={c.icon}/>
            ))}
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}