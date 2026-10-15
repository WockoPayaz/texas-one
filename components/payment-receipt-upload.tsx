'use client';
import {useEffect, useRef, useState} from 'react';
import {ImagePlus, X} from 'lucide-react';

export function PaymentReceiptUpload() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <div className="receipt-upload">
    <label><span><ImagePlus size={18}/> Payment receipt screenshot</span>
      <input ref={input} name="receipt" type="file" accept="image/png,image/jpeg,image/webp" required aria-describedby="receipt-help" onChange={e => {
        const next = e.target.files?.[0];
        if (!next) { setFile(null); setError(''); return; }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type) || next.size > 4000000) {
          setError('Choose a JPG, PNG or WebP image under 4 MB.');
          e.target.value = ''; setFile(null); return;
        }
        setError(''); setFile(next);
      }}/>
    </label>
    {preview && <div className="receipt-preview"><img src={preview} alt="Your payment receipt preview"/><button type="button" onClick={() => {setFile(null); if (input.current) input.current.value = '';}}><X size={16}/> Remove screenshot</button></div>}
    {error && <p role="alert">{error}</p>}
    <small id="receipt-help">JPG, PNG or WebP · up to 4 MB. Only restaurant managers can view it.</small>
  </div>;
}
