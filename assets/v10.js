const v9ModuleBuilder=moduleHTML,v9ModuleHydrator=hydrateModule;

function financeFigures(){
  const sales=invoices.reduce((s,x)=>s+Number(x.revenue),0);
  const salesCost=invoices.reduce((s,x)=>s+Number(x.cost),0);
  const operatingExpenses=expenses.reduce((s,x)=>s+Number(x.amount),0);
  const cash=transactions.filter(x=>x.kind!=='cogs').reduce((s,x)=>s+Number(x.amount),0);
  const supplierDebt=purchases.reduce((s,x)=>s+Number(x.total)-Number(x.paid),0);
  return {sales,salesCost,operatingExpenses,cash,supplierDebt,grossProfit:sales-salesCost,netProfit:sales-salesCost-operatingExpenses};
}

moduleHTML=function(name,type){
  const common=`<div class="module-top"><div><small>الإدارة</small><h1>${name}</h1></div><button class="outline" data-back-home>العودة للرئيسية</button></div>`;
  if(name==='الحسابات')return common+`
    <div class="finance-nav"><button class="active" data-finance-tab="overview">نظرة عامة</button><button data-finance-tab="movements">الحركات المالية</button><button data-finance-tab="invoices">فواتير المبيعات</button><button data-finance-tab="purchases">المشتريات والديون</button></div>
    <section class="finance-page active" data-finance-page="overview"><div class="finance-hero"><div><small>الوضع المالي الحالي</small><h2>نظرة عامة على الحسابات</h2><p>الخزنة والسيولة منفصلتان عن الربح وديون الموردين.</p></div><button class="outline" id="printFinanceOverview">طباعة الملخص</button></div><div class="account-summary finance-overview" id="financeOverview"></div><div class="finance-explain" id="financeExplain"></div></section>
    <section class="finance-page" data-finance-page="movements"><div class="module-toolbar"><button class="primary small" id="newExpense">+ مصروف جديد</button><button class="outline" id="openingBalance">إضافة رصيد/رأس مال</button></div><div class="panel"><table><thead><tr><th>التاريخ</th><th>النوع</th><th>البيان</th><th>الأثر النقدي</th></tr></thead><tbody id="financeRows"></tbody></table></div></section>
    <section class="finance-page" data-finance-page="invoices"><div class="panel"><table><thead><tr><th>الفاتورة</th><th>الطلب</th><th>المبيعات</th><th>التكلفة</th><th>الربح</th></tr></thead><tbody id="financeInvoices"></tbody></table></div></section>
    <section class="finance-page" data-finance-page="purchases"><div class="module-toolbar"><button class="primary small" id="financeNewPurchase">+ تسجيل شراء</button></div><div class="panel"><table><thead><tr><th>التاريخ</th><th>المورد</th><th>المنتج</th><th>الإجمالي</th><th>المدفوع</th><th>الدين</th></tr></thead><tbody id="financePurchases"></tbody></table></div></section>`;
  if(name==='الإعدادات')return common+`
    <section class="settings-shell"><div class="settings-intro"><div><small>إدارة المنصة</small><h2>الهوية وبيانات الموقع</h2><p>أي تعديل هنا يُحفظ على الإنترنت ويظهر في واجهة العميل والمندوب والإدارة وصفحة من نحن.</p></div><button class="primary" id="savePlatformSettings">حفظ كل التغييرات</button></div>
    <div class="settings-sections"><article class="settings-card"><h3>هوية المنصة</h3><div class="settings-logo"><img id="settingsLogoPreview" src="assets/brand-mark.svg" alt="معاينة الشعار"><div><label>تحميل شعار جديد</label><input id="settingsLogo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"><small>PNG أو JPG أو WebP أو SVG — بحد أقصى 5MB</small></div></div><div class="split"><div class="form-row"><label>اسم المنصة</label><input id="settingsPlatformName"></div><div class="form-row"><label>الاسم أو الوصف التجاري</label><input id="settingsBusinessName"></div></div></article>
    <article class="settings-card"><h3>بيانات التواصل</h3><div class="split"><div class="form-row"><label>رقم واتساب بكود الدولة</label><input id="settingsWhatsapp"></div><div class="form-row"><label>رقم الهاتف</label><input id="settingsPhone"></div></div><div class="split"><div class="form-row"><label>البريد الإلكتروني</label><input id="settingsEmail" type="email"></div><div class="form-row"><label>العنوان</label><input id="settingsAddress"></div></div></article>
    <article class="settings-card"><h3>تذييل الموقع</h3><div class="form-row"><label>النص المختصر أسفل الموقع</label><input id="settingsFooter"></div></article>
    <article class="settings-card settings-tools"><h3>أدوات الإدارة</h3><button class="outline" data-open-manager>إدارة المنتجات والمناطق</button><button class="outline" id="settingsPrint">طباعة تقرير المنصة</button></article></div></section>`;
  return v9ModuleBuilder(name,type);
};

hydrateModule=function(name,m){
  if(name!=='الحسابات'&&name!=='الإعدادات')return v9ModuleHydrator(name,m);
  if(name==='الحسابات'){
    const f=financeFigures();
    $('#financeOverview').innerHTML=`<article class="cash-card"><span>الموجود حاليًا في الخزنة</span><b>${money(f.cash)}</b><small>المقبوضات ورأس المال ناقص المدفوعات</small></article><article class="profit-card"><span>صافي الربح</span><b>${money(f.netProfit)}</b><small>المبيعات − تكلفة المباع − المصروفات</small></article><article><span>إجمالي المبيعات المسلّمة</span><b>${money(f.sales)}</b><small>${invoices.length} فاتورة</small></article><article><span>تكلفة البضاعة المباعة</span><b>${money(f.salesCost)}</b><small>تكلفة المنتجات التي تم تسليمها فقط</small></article><article><span>المصروفات التشغيلية</span><b>${money(f.operatingExpenses)}</b><small>تؤثر على الخزنة والربح</small></article><article class="debt-card"><span>ديون الموردين</span><b>${money(f.supplierDebt)}</b><small>التزامات منفصلة وليست خسارة</small></article>`;
    $('#financeExplain').innerHTML=`<article><b>الربح الإجمالي</b><span>${money(f.grossProfit)}</span><small>المبيعات بعد تكلفة البضاعة وقبل المصروفات.</small></article><article><b>الفرق المهم</b><span>الخزنة ≠ الربح</span><small>شراء المخزون يقلل النقدية لكنه لا يتحول لخسارة إلا عند بيع المنتج.</small></article>`;
    $('#financeRows').innerHTML=transactions.length?transactions.map(x=>`<tr><td>${new Date(x.created_at).toLocaleString('ar')}</td><td>${financeKind(x.kind)}</td><td>${x.description}</td><td>${x.kind==='cogs'?'غير نقدي — '+money(x.amount):money(x.amount)}</td></tr>`).join(''):'<tr><td colspan="4" class="empty-cell">لا توجد حركات مالية</td></tr>';
    $('#financeInvoices').innerHTML=invoices.length?invoices.map(x=>`<tr><td>${x.invoice_number}</td><td>${orders.find(o=>o.dbId===x.order_id)?.id||'—'}</td><td>${money(x.revenue)}</td><td>${money(x.cost)}</td><td>${money(x.profit)}</td></tr>`).join(''):'<tr><td colspan="5" class="empty-cell">لا توجد فواتير مبيعات</td></tr>';
    $('#financePurchases').innerHTML=purchases.length?purchases.map(x=>`<tr><td>${new Date(x.created_at).toLocaleDateString('ar')}</td><td>${suppliers.find(s=>s.id===x.supplier_id)?.name||'—'}</td><td>${products.find(p=>p.id===x.product_id)?.name||'—'}</td><td>${money(x.total)}</td><td>${money(x.paid)}</td><td>${money(Number(x.total)-Number(x.paid))}</td></tr>`).join(''):'<tr><td colspan="6" class="empty-cell">لا توجد مشتريات</td></tr>';
    $$('[data-finance-tab]').forEach(b=>b.onclick=()=>{$$('[data-finance-tab]').forEach(x=>x.classList.toggle('active',x===b));$$('[data-finance-page]').forEach(x=>x.classList.toggle('active',x.dataset.financePage===b.dataset.financeTab))});
    $('#newExpense').onclick=openExpense;$('#openingBalance').onclick=openOpeningBalance;$('#financeNewPurchase').onclick=openPurchase;$('#printFinanceOverview').onclick=()=>window.print();
  }
  if(name==='الإعدادات'){
    const s=window.qitafSettings||{platform_name:'قِطاف',business_name:'للبيع والتوزيع',footer_text:'خدمة موثوقة داخل مناطق التوصيل المحددة.'};
    $('#settingsPlatformName').value=s.platform_name||'';$('#settingsBusinessName').value=s.business_name||'';$('#settingsWhatsapp').value=s.whatsapp||'';$('#settingsPhone').value=s.phone||'';$('#settingsEmail').value=s.email||'';$('#settingsAddress').value=s.address||'';$('#settingsFooter').value=s.footer_text||'';if(s.logo_url)$('#settingsLogoPreview').src=s.logo_url;
    $('#settingsLogo').onchange=e=>{if(e.target.files[0])$('#settingsLogoPreview').src=URL.createObjectURL(e.target.files[0])};
    $('#savePlatformSettings').onclick=savePlatformSettings;$('#settingsPrint').onclick=()=>window.print();
    const managerButton=m.querySelector('[data-open-manager]');managerButton.onclick=()=>{m.style.display='none';m.previousElementSibling.style.display='block';setTimeout(()=>$('.management').scrollIntoView({behavior:'smooth'}),50)};
  }
};

function financeKind(kind){return ({sale:'مبيعات',cogs:'تكلفة مبيعات',expense:'مصروف',purchase_payment:'سداد مورد',capital:'رأس مال/رصيد'})[kind]||kind}
async function uploadBrand(file){const safe=('logo-'+Date.now()+'-'+file.name).replace(/[^a-zA-Z0-9._-]/g,'-');const response=await fetch(`${SUPABASE_URL}/storage/v1/object/brand-assets/${safe}`,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':file.type||'application/octet-stream'},body:file});if(!response.ok)throw new Error(await response.text());return `${SUPABASE_URL}/storage/v1/object/public/brand-assets/${safe}`}
async function savePlatformSettings(){
  const button=$('#savePlatformSettings');button.disabled=true;button.textContent='جارٍ الحفظ...';
  try{
    const file=$('#settingsLogo').files[0],logo=file?await uploadBrand(file):(window.qitafSettings?.logo_url||null);
    await db('platform_settings?id=eq.1',{method:'PATCH',body:JSON.stringify({platform_name:$('#settingsPlatformName').value.trim()||'قِطاف',business_name:$('#settingsBusinessName').value.trim()||'للبيع والتوزيع',logo_url:logo,whatsapp:$('#settingsWhatsapp').value.trim(),phone:$('#settingsPhone').value.trim(),email:$('#settingsEmail').value.trim(),address:$('#settingsAddress').value.trim(),footer_text:$('#settingsFooter').value.trim(),updated_at:new Date().toISOString()})});
    if(window.loadBranding)await window.loadBranding();toast('تم حفظ الهوية وتطبيقها على الموقع');
  }catch(error){console.error(error);toast('تعذر حفظ الإعدادات')}finally{button.disabled=false;button.textContent='حفظ كل التغييرات'}
}

const whatsappButton=document.querySelector('[data-action="whatsapp"]');if(whatsappButton)whatsappButton.onclick=()=>{const n=window.qitafSettings?.whatsapp;if(!n)return toast('أضف رقم واتساب من الإعدادات');window.open('https://wa.me/'+n.replace(/\D/g,''),'_blank','noopener')};
