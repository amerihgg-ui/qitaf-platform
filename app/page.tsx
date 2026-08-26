"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronLeft, MapPin, Menu, Minus, Phone, Plus, Search, ShoppingBag, UserRound } from "lucide-react";

const products = [
  { id: 1, name: "تفاح أحمر", detail: "طازج ومختار بعناية", price: 75, unit: "كجم", icon: "🍎", tone: "red" },
  { id: 2, name: "موز بلدي", detail: "حلو وطبيعي", price: 48, unit: "كجم", icon: "🍌", tone: "yellow" },
  { id: 3, name: "طماطم", detail: "حصاد اليوم", price: 32, unit: "كجم", icon: "🍅", tone: "orange" },
  { id: 4, name: "فستق حلبي", detail: "درجة أولى", price: 260, unit: "كجم", icon: "🥜", tone: "green" },
];

const categories = [["🍎", "الفاكهة", "مختارة يوميًا"], ["🥬", "الخضروات", "من المزرعة"], ["📦", "الصناديق", "توفير للعائلة"], ["🌰", "المكسرات", "جودة ممتازة"]];

export default function Home() {
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const total = useMemo(() => products.reduce((sum, p) => sum + p.price * (cart[p.id] || 0), 0), [cart]);
  const change = (id: number, delta: number) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) + delta) }));

  return <main>
    <div className="announcement">توصيل سريع للمنتجات الطازجة • تواصل معنا عبر واتساب</div>
    <header className="header">
      <a className="brand" href="#"><span className="brand-mark">ق</span><span><b>قِطاف</b><small>للبيع والتوزيع</small></span></a>
      <nav><a href="#products">المنتجات</a><a href="#categories">الأقسام</a><a href="#about">من نحن</a></nav>
      <div className="header-actions"><button className="icon-button" aria-label="بحث"><Search size={20}/></button><button className="account"><UserRound size={19}/><span>تسجيل الدخول</span></button><button className="cart-button" onClick={() => setCartOpen(true)}><ShoppingBag size={20}/><span>السلة</span>{totalItems > 0 && <i>{totalItems}</i>}</button><button className="menu"><Menu/></button></div>
    </header>

    <section className="hero">
      <div className="hero-copy"><span className="eyebrow">طازج • موثوق • إلى باب بيتك</span><h1>الطازج لحد<br/><em>بابك.</em></h1><p>فاكهة وخضروات منتقاة بعناية، بالكيلو أو بالصندوق، مع توصيل يناسب موعدك.</p><div className="hero-actions"><a className="primary" href="#products">تسوّق الآن <ChevronLeft size={19}/></a><a className="whatsapp" href="https://wa.me/" target="_blank">اطلب عبر واتساب</a></div><div className="hero-meta"><span>✓ جودة مضمونة</span><span>✓ دفع عند الاستلام</span></div></div>
      <div className="hero-visual"><Image src="/qitaf-hero-fresh-market.png" alt="تشكيلة فاكهة وخضروات طازجة من قِطاف" fill priority sizes="(max-width: 760px) 100vw, 48vw"/><div className="fresh-card"><span>🌿</span><b>طازج كل يوم</b><small>نختار الأفضل لك</small></div></div>
    </section>

    <section className="features"><div><span>🚚</span><p><b>توصيل مرن</b><small>في الموعد المناسب لك</small></p></div><div><span>⚖️</span><p><b>بالكيلو أو الصندوق</b><small>اختر الكمية التي تحتاجها</small></p></div><div><span>✨</span><p><b>اختيار بعناية</b><small>منتجات طازجة وجودة مضمونة</small></p></div></section>

    <section className="section" id="categories"><div className="section-title"><div><span>تسوّق حسب القسم</span><h2>كل ما تحتاجه في مكان واحد</h2></div><a href="#products">عرض الكل <ChevronLeft size={18}/></a></div><div className="category-grid">{categories.map(([icon,name,sub]) => <a href="#products" className="category" key={name}><span>{icon}</span><div><h3>{name}</h3><p>{sub}</p></div><ChevronLeft size={20}/></a>)}</div></section>

    <section className="section products-section" id="products"><div className="section-title"><div><span>الأكثر طلبًا</span><h2>مختارات قِطاف لهذا اليوم</h2></div><a href="#products">كل المنتجات <ChevronLeft size={18}/></a></div><div className="product-grid">{products.map((p) => { const qty=cart[p.id]||0; return <article className="product" key={p.id}><div className={`product-image ${p.tone}`}><span>{p.icon}</span><button>♡</button></div><div className="product-body"><small>{p.detail}</small><h3>{p.name}</h3><div className="unit-switch"><button className="active">كيلو</button><button>صندوق</button></div><div className="product-footer"><p><b>{p.price}</b> ل.ت <small>/ {p.unit}</small></p>{qty===0?<button className="add" onClick={()=>change(p.id,1)}><Plus size={18}/> أضف</button>:<div className="quantity"><button onClick={()=>change(p.id,-1)}><Minus size={15}/></button><b>{qty}</b><button onClick={()=>change(p.id,1)}><Plus size={15}/></button></div>}</div></div></article>})}</div></section>

    <section className="delivery"><div><MapPin/><span><small>نوصّل إلى</small><b>مناطق مختارة بسرعة وأمان</b></span></div><p>حدّد عنوانك عند الطلب، وسنؤكد معك أقرب موعد متاح.</p><button>اعرف مناطق التوصيل</button></section>
    <footer id="about"><a className="brand light" href="#"><span className="brand-mark">ق</span><span><b>قِطاف</b><small>للبيع والتوزيع</small></span></a><p>منتجات طازجة، خدمة موثوقة، وتوصيل أقرب إليك.</p><div><a href="#products">المنتجات</a><a href="#categories">الأقسام</a><a href="#about">من نحن</a><a href="tel:+000000000"><Phone size={15}/> تواصل معنا</a></div></footer>

    {cartOpen && <div className="cart-overlay" onClick={()=>setCartOpen(false)}><aside className="cart-panel" onClick={e=>e.stopPropagation()}><div className="cart-head"><h2>سلة التسوق <span>{totalItems}</span></h2><button onClick={()=>setCartOpen(false)}>×</button></div>{totalItems===0?<div className="empty"><ShoppingBag size={42}/><h3>سلتك فارغة</h3><p>ابدأ بإضافة المنتجات الطازجة</p></div>:<><div className="cart-lines">{products.filter(p=>cart[p.id]).map(p=><div className="cart-line" key={p.id}><span>{p.icon}</span><div><b>{p.name}</b><small>{p.price} ل.ت / {p.unit}</small></div><div className="quantity"><button onClick={()=>change(p.id,-1)}><Minus size={13}/></button><b>{cart[p.id]}</b><button onClick={()=>change(p.id,1)}><Plus size={13}/></button></div></div>)}</div><div className="cart-total"><span>الإجمالي</span><b>{total.toLocaleString("ar")} ل.ت</b></div><button className="checkout">متابعة الطلب</button><small className="login-note">يلزم تسجيل الدخول لإتمام الطلب</small></>}</aside></div>}
  </main>;
}
