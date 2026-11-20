"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Plus, Search, PackagePlus, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatBusinessDate, type Product, type AccountRow, type StockMovement } from "@/lib/business-client";
import { formatNPR } from "@/lib/format";
import { FormDialog } from "@/components/ui/form-dialog";
import { Field, TextInput, SelectInput, primaryButton, secondaryButton } from "@/components/ui/form-fields";
import { Reveal } from "@/components/ui/reveal";

type Dialog="create"|"purchase"|"adjust"|null;
const empty={sku:"",name:"",category:"Socks",size:"",color:"",cost:"",price:"",stock:"0"};
const cents=(n:number)=>Number.isFinite(n)&&Math.round(n*100)/100===n;
export function InventoryWorkspace({products,accounts,movements}:{products:Product[];accounts:AccountRow[];movements:StockMovement[]}){
 const router=useRouter();
 const [dialog,setDialog]=useState<Dialog>(null);const [product,setProduct]=useState<Product|null>(null);
 const [search,setSearch]=useState("");const [form,setForm]=useState(empty);
 const [qty,setQty]=useState("1");const [cost,setCost]=useState("");const [account,setAccount]=useState(accounts[0]?.id??"");
 const [delta,setDelta]=useState("-1");const [reason,setReason]=useState("");
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [notice,setNotice]=useState("");
 const filtered=products.filter(p=>[p.name,p.sku,p.category,p.size??"",p.color??""].join(" ").toLowerCase().includes(search.toLowerCase()));
 const title=dialog==="create"?"Add new product":dialog==="purchase"?"Purchase / restock inventory":"Adjust stock count";
 const open=(type:Dialog,p?:Product)=>{setDialog(type);setProduct(p??null);setError("");setReason("");setQty("1");setDelta("-1");setCost(p?String(p.cost_price):"");};
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setError("");setNotice("");setBusy(true);
  try{
   const db=createClient();
   if(dialog==="create"){
    const c=Number(form.cost),v=Number(form.price),s=Number(form.stock);
    if(!form.name.trim()||!form.sku.trim()||!form.category.trim()||!cents(c)||!cents(v)||c<0||v<0||!Number.isInteger(s)||s<0)throw new Error("Enter a SKU, product name, valid prices and stock quantity.");
    const {error:x}=await db.rpc("create_product_v4",{p_sku:form.sku,p_name:form.name,p_category:form.category,p_size:form.size,p_color:form.color,p_cost:c,p_price:v,p_stock:s});
    if(x)throw x;setForm(empty);setNotice("Product created with an opening-stock audit record.");
   }else if(dialog==="purchase"){
    const q=Number(qty),c=Number(cost);
    if(!product||!account||!Number.isInteger(q)||q<=0||!cents(c)||c<0)throw new Error("Enter a positive quantity, valid unit cost and payment account.");
    const {error:x}=await db.rpc("purchase_stock_v4",{p_product_id:product.id,p_quantity:q,p_unit_cost:c,p_account_id:account,p_notes:reason.trim()||null});
    if(x)throw x;setNotice("Stock received and supplier payment recorded in the selected account.");
   }else if(dialog==="adjust"){
    const d=Number(delta);
    if(!product||!Number.isInteger(d)||d===0||reason.trim().length<5)throw new Error("Enter a nonzero quantity change and a reason (at least 5 characters).");
    const {error:x}=await db.rpc("adjust_stock_v4",{p_product_id:product.id,p_delta:d,p_reason:reason.trim()});
    if(x)throw x;setNotice("Stock count adjusted. No cash transaction was recorded.");
   }
   setDialog(null);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Could not save stock change.");}finally{setBusy(false);}
 }
 const productName=(id:string)=>products.find(p=>p.id===id)?.name??"Product";
 return <Reveal>
  <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Stock and purchasing</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Inventory</h1><p className="mt-2 text-sm text-neutral-500">Purchase stock, manage variants and keep an audit of adjustments.</p></div><button className={primaryButton} onClick={()=>open("create")}><Plus size={16}/> Add product</button></div>
  {notice&&<p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
  {!accounts.length&&<p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Create a payment account on the Accounts page before entering paid stock purchases. Opening stock and stock-count adjustments do not require a payment account.</p>}
  <div className="mt-6 grid gap-3 sm:grid-cols-3">{[{label:"Product variants",value:products.length},{label:"Units available",value:products.reduce((n,p)=>n+p.stock_quantity,0)},{label:"Low stock (≤5)",value:products.filter(p=>p.stock_quantity<=5).length}].map(s=><div key={s.label} className="rounded-2xl border border-neutral-200 bg-white p-5 transition-transform motion-safe:hover:-translate-y-0.5"><p className="text-xs text-neutral-500">{s.label}</p><p className="mt-2 text-2xl font-bold tabular-nums">{s.value}</p></div>)}</div>
  <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-4 sm:px-6"><h2 className="font-semibold">Products</h2><div className="relative w-full sm:w-64"><Search size={16} className="absolute left-3 top-3 text-neutral-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find SKU or product" aria-label="Search products" className="w-full rounded-xl border border-neutral-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-neutral-700"/></div></div>
   {!filtered.length?<div className="py-14 text-center text-sm text-neutral-500"><Boxes className="mx-auto mb-2"/>No matching products.</div>:<div className="overflow-x-auto"><table className="w-full min-w-[790px] text-left text-sm"><thead className="bg-neutral-50 text-xs text-neutral-500"><tr><th className="px-5 py-3 font-medium">Product</th><th className="px-4 py-3 font-medium">Variant / SKU</th><th className="px-4 py-3 font-medium">Avg. cost</th><th className="px-4 py-3 font-medium">Price</th><th className="px-4 py-3 font-medium">Stock</th><th className="px-5 py-3 font-medium">Actions</th></tr></thead><tbody className="divide-y divide-neutral-100">{filtered.map(p=><tr key={p.id} className="hover:bg-neutral-50"><td className="px-5 py-4"><strong className="font-medium">{p.name}</strong><span className="mt-1 block text-xs text-neutral-500">{p.category}</span></td><td className="px-4 py-4"><span className="font-mono text-xs">{p.sku}</span><span className="mt-1 block text-xs text-neutral-500">{[p.size,p.color].filter(Boolean).join(" / ")||"Standard"}</span></td><td className="px-4 py-4 tabular-nums">{formatNPR(p.cost_price)}</td><td className="px-4 py-4 tabular-nums">{formatNPR(p.selling_price)}</td><td className="px-4 py-4 font-semibold tabular-nums">{p.stock_quantity}</td><td className="px-5 py-4"><div className="flex gap-2"><button type="button" className={secondaryButton} disabled={!accounts.length} onClick={()=>open("purchase",p)} title="Add paid inventory"><PackagePlus size={15}/> Buy</button><button type="button" className={secondaryButton} onClick={()=>open("adjust",p)} title="Record a stock-count adjustment"><SlidersHorizontal size={15}/> Adjust</button></div></td></tr>)}</tbody></table></div>}
  </div>
  <section className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white"><div className="border-b border-neutral-100 p-5"><h2 className="font-semibold">Inventory history</h2><p className="mt-1 text-xs text-neutral-500">Latest 80 movements · negative numbers remove stock</p></div>{!movements.length?<p className="p-6 text-sm text-neutral-500">No stock movements yet.</p>:<div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead className="bg-neutral-50 text-neutral-500"><tr><th className="px-5 py-3">Date</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Type / note</th><th className="px-5 py-3 text-right">Units</th></tr></thead><tbody className="divide-y divide-neutral-100">{movements.map(m=><tr key={m.id}><td className="px-5 py-3 text-neutral-500">{formatBusinessDate(m.created_at)}</td><td className="px-4 py-3 font-medium">{productName(m.product_id)}</td><td className="px-4 py-3"><span className="capitalize">{m.movement_type}</span><span className="block max-w-sm truncate text-neutral-400" title={m.notes??""}>{m.notes??"—"}</span></td><td className="px-5 py-3 text-right font-semibold tabular-nums">{m.quantity_delta>0?"+":""}{m.quantity_delta}</td></tr>)}</tbody></table></div>}</section>
  <FormDialog title={title} open={dialog!==null} onClose={()=>{if(!busy){setDialog(null);setError("");}}}><form onSubmit={submit} className="space-y-4">
   {dialog==="create"?<><div className="grid grid-cols-2 gap-3"><Field label="Name"><TextInput required autoFocus maxLength={120} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Unique SKU"><TextInput required maxLength={40} value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})}/></Field></div><Field label="Category"><SelectInput value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{["Socks","Undergarments","Stockings","Hats","Other"].map(c=><option key={c}>{c}</option>)}</SelectInput></Field><div className="grid grid-cols-2 gap-3"><Field label="Size"><TextInput maxLength={40} value={form.size} onChange={e=>setForm({...form,size:e.target.value})}/></Field><Field label="Color"><TextInput maxLength={40} value={form.color} onChange={e=>setForm({...form,color:e.target.value})}/></Field><Field label="Unit cost (Rs.)"><TextInput required type="number" min="0" step="0.01" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/></Field><Field label="Selling price (Rs.)"><TextInput required type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></Field><Field label="Opening stock"><TextInput required type="number" min="0" step="1" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></Field></div><p className="text-xs text-neutral-500">Each size and color gets its own SKU. Opening stock does not deduct cash; use Buy for new purchases.</p></>:
   dialog==="purchase"?<><p className="rounded-xl bg-neutral-50 p-3 text-sm font-semibold">{product?.name} · {product?.sku}</p><Field label="Quantity purchased"><TextInput autoFocus required type="number" min="1" step="1" value={qty} onChange={e=>setQty(e.target.value)}/></Field><Field label="Supplier unit cost (Rs.)"><TextInput required type="number" min="0" step="0.01" value={cost} onChange={e=>setCost(e.target.value)}/></Field><Field label="Paid from account"><SelectInput value={account} required onChange={e=>setAccount(e.target.value)}><option value="">Choose account</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {formatNPR(a.balance)}</option>)}</SelectInput></Field><p className="rounded-xl bg-neutral-50 p-3 text-sm">Supplier payment: <strong>{formatNPR(Math.max(0,Number(qty)||0)*Math.max(0,Number(cost)||0))}</strong></p><Field label="Notes"><TextInput maxLength={250} value={reason} onChange={e=>setReason(e.target.value)}/></Field><p className="text-xs text-neutral-500">This workflow assumes the supplier is paid now. Unit cost becomes a weighted-average cost. Unpaid supplier invoices are not supported yet.</p></>:
   <><p className="rounded-xl bg-neutral-50 p-3 text-sm font-semibold">{product?.name} · Current quantity: {product?.stock_quantity}</p><Field label="Quantity change (+ add / − remove)"><TextInput autoFocus required type="number" step="1" value={delta} onChange={e=>setDelta(e.target.value)}/></Field><Field label="Reason"><TextInput minLength={5} maxLength={250} required placeholder="Damaged items found in stock count" value={reason} onChange={e=>setReason(e.target.value)}/></Field><p className="text-xs text-neutral-500">Use Adjust for counting errors, damage or shrinkage. It does not record supplier payments or calculate write-off expense.</p></>}
   {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
   <div className="flex justify-end gap-2"><button type="button" className={secondaryButton} disabled={busy} onClick={()=>setDialog(null)}>Cancel</button><button type="submit" className={primaryButton} disabled={busy}>{busy?"Saving…":dialog==="purchase"?"Save purchase":dialog==="adjust"?"Save adjustment":"Save product"}</button></div>
  </form></FormDialog>
 </Reveal>;
}
