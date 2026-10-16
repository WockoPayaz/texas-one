import type {Settings} from '@/lib/menu';

type ReceiptOrder = {
  id: string; createdAt: string; mode: string; status: string;
  refundAmount?: number; refundedAt?: string; returnReason?: string;
  name: string; phone: string; address?: string; notes?: string;
  table?: {label: string}; payment: string; paymentStatus: string;
  subtotal: number; deliveryFee: number; total: number;
  items: {name: string; variant: string; cheese?: boolean; quantity: number; unitPrice: number}[];
};
const amount = (value: number) => value.toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const paymentNames: Record<string, string> = {cash: 'Cash', jazzcash: 'JazzCash', easypaisa: 'Easypaisa', bank: 'Bank transfer'};
const paymentStatuses: Record<string, string> = {refunded: 'REFUNDED', paid: 'PAID', unpaid: 'UNPAID', 'awaiting-verification': 'AWAITING VERIFICATION', rejected: 'PAYMENT REJECTED'};

export function PosReceipt({order, settings}: {order: ReceiptOrder; settings: Settings}) {
  const cancelled = order.status === 'cancelled';
  const paid = order.paymentStatus === 'paid';
  const returned = order.status === 'returned';
  const refunded = order.paymentStatus === 'refunded';
  const date = new Date(order.createdAt);
  return <article className="pos-receipt" aria-label="Printable sales receipt">
    <style>{'@media print { @page { size: auto; margin: 4mm; } }'}</style>
    <header className="pos-center">
      <h1>{settings.name}</h1>
      <p>{settings.address}</p>
      <p>Tel: {settings.phone}</p>
      <p>{settings.hours}</p>
      <h2>{refunded ? 'REFUND RECEIPT' : returned ? 'RETURNED ORDER' : cancelled ? 'CANCELLED ORDER' : 'SALES RECEIPT'}</h2>
    </header>
    <section className="pos-section">
      <p className="pos-row"><strong>Order #{order.id.slice(0, 8).toUpperCase()}</strong><span>{order.mode === 'dine-in' ? 'DINE-IN' : order.mode.toUpperCase()}</span></p>
      <p className="pos-row"><span>{date.toLocaleDateString('en-GB', {timeZone: 'Asia/Karachi', day: '2-digit', month: 'short', year: 'numeric'})}</span><span>{date.toLocaleTimeString('en-GB', {timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true})} PKT</span></p>
      {order.table?.label && <p><strong>Table:</strong> {order.table.label}</p>}
      <p><strong>Customer:</strong> {order.name}</p>
      <p><strong>Phone:</strong> {order.phone}</p>
      {order.mode === 'delivery' && order.address && <p><strong>Deliver to:</strong> {order.address}</p>}
    </section>
    <table className="pos-items">
      <colgroup><col className="pos-qty"/><col/><col className="pos-amount"/></colgroup>
      <thead><tr><th>Qty</th><th>Item</th><th>Rs.</th></tr></thead>
      <tbody>{order.items.map((item, index) => <tr key={index}>
        <td>{item.quantity}</td>
        <td><strong>{item.name}</strong><span>{item.variant}{item.cheese ? ' + extra cheese' : ''}</span><span>@ {amount(item.unitPrice)}</span></td>
        <td>{amount(item.unitPrice * item.quantity)}</td>
      </tr>)}</tbody>
    </table>
    <section className="pos-section pos-totals">
      <p className="pos-row"><span>Subtotal</span><span>{amount(order.subtotal)}</span></p>
      {(order.mode === 'delivery' || order.deliveryFee > 0) && <p className="pos-row"><span>Delivery</span><span>{amount(order.deliveryFee)}</span></p>}
      <p className="pos-row pos-grand"><strong>TOTAL (Rs.)</strong><strong>{amount(order.total)}</strong></p>
      <p className="pos-row"><span>Payment</span><span>{paymentNames[order.payment] || order.payment}</span></p>
      <p className="pos-row"><span>Status</span><strong>{paymentStatuses[order.paymentStatus] || order.paymentStatus}</strong></p>
      {!cancelled && !returned && !refunded && <p className="pos-row"><strong>{paid ? 'Balance due' : 'Amount due'} (Rs.)</strong><strong>{amount(paid ? 0 : order.total)}</strong></p>}
      {order.paymentStatus === 'awaiting-verification' && <p className="pos-note">Payment proof received; payment is not yet verified.</p>}
      {refunded && <p className="pos-row"><strong>REFUNDED (Rs.)</strong><strong>{amount(order.refundAmount??order.total)}</strong></p>}
      {returned && !refunded && <p className="pos-note">Order returned. No refund is recorded.</p>}
      {order.refundedAt && <p className="pos-note">Refund recorded: {new Date(order.refundedAt).toLocaleString('en-PK',{timeZone:'Asia/Karachi'})}</p>}
      {order.returnReason && <p className="pos-note">Return reason: {order.returnReason}</p>}
      {cancelled && <p className="pos-note">Order cancelled. This receipt does not confirm a refund.</p>}
    </section>
    {order.notes && <section className="pos-section"><strong>Order notes</strong><p>{order.notes}</p></section>}
    <footer className="pos-center pos-footer">
      <p>Items: {order.items.reduce((sum, item) => sum + item.quantity, 0)}</p>
      <strong>Thank you for choosing TEXAS ONE!</strong>
      <p>We look forward to serving you again.</p>
      <p className="pos-id">Order ID: {order.id}</p>
    </footer>
  </article>;
}
