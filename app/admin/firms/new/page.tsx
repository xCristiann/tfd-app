import FirmForm from '@/components/admin/FirmForm'
export default function NewFirmPage() {
  return (
    <div>
      <h1 style={{fontSize:'22px',fontWeight:800,marginBottom:'4px'}}>Add New Firm</h1>
      <p style={{fontSize:'13.5px',color:'var(--t2)',marginBottom:'28px'}}>Fill in firm details. Add challenges and rules after saving.</p>
      <FirmForm />
    </div>
  )
}
