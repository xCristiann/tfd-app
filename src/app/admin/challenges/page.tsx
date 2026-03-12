import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { ADMIN_NAV } from '@/lib/nav'

const PRODUCTS = [
  { name:'$25K Challenge', size:'$25,000', price:'$199',ph1:'8%/5%/8%',ph2:'5%/5%/8%',split:'80%',sales:4821,rev:'$959K' },
  { name:'$100K Challenge',size:'$100,000',price:'$549',ph1:'10%/5%/10%',ph2:'5%/5%/10%',split:'85%',sales:7204,rev:'$3.95M' },
  { name:'$200K Challenge',size:'$200,000',price:'$999',ph1:'10%/5%/10%',ph2:'5%/5%/10%',split:'90%',sales:2256,rev:'$2.25M' },
]

export function AdminChallengePage() {
  const { toasts, toast, dismiss } = useToast()
  return (
    <>
      <DashboardLayout title="Challenge Products" nav={ADMIN_NAV} accentColor="red">
        <div className="grid grid-cols-3 gap-[14px]">
          {PRODUCTS.map(p=>(
            <Card key={p.name}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-serif text-[17px] font-bold text-[var(--gold)]">{p.size}</div>
                  <div className="text-[11px] text-[var(--text2)]">{p.name}</div>
                </div>
                <div className="font-serif text-[22px] font-bold">{p.price}</div>
              </div>
              {[['Phase 1 (Target/Daily/Max)',p.ph1],['Phase 2 (Target/Daily/Max)',p.ph2],['Profit Split',p.split],['Total Sales',p.sales.toLocaleString()],['Revenue',p.rev]].map(([l,v])=>(
                <div key={l} className="flex justify-between py-[6px] border-b border-[var(--dim)] last:border-0">
                  <span className="text-[10px] text-[var(--text3)]">{l}</span>
                  <span className="font-mono text-[11px] text-[var(--gold)]">{v}</span>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full mt-3"
                onClick={()=>toast('info','✏️','Edit',`Editing ${p.name}`)}>Edit Product</Button>
            </Card>
          ))}
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
