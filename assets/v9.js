let suppliers=[],drivers=[],purchases=[],expenses=[],invoices=[],transactions=[];
const rpc=(name,body)=>db(`rpc/${name}`,{method:'POST',body:JSON.stringify(body)});
const money=n=>Number(n||0).toLocaleString('ar')+' ل.ت';

async function loadBusinessData(){
  try{
    [suppliers,drivers,purchases,expenses,invoices,transactions]=await Promise.all([
      db('suppliers?select=*&order=created_at.desc'),db('drivers?select=*&order=created_at.desc'),
      db('purchases?select=*&order=created_at.desc'),db('expenses?select=*&order=created_at.desc'),
      db('sales_invoices?select=*&order=created_at.desc'),db('financial_transactions?select=*&order=created_at.desc')
    ]);
    renderBusinessMetrics();
  }catch(e){console.error(e)}
}

async function completeOrder(id){
  try{
    const result=await rpc('complete_order',{p_order_id:id});
    await Promise.all([syncAll(),loadBusinessData()]);
    toast(result.already_completed?'الطلب مسجل كمُسلّم بالفعل':`تم التسليم — الربح ${money(result.profit)}`);
    return true;
  }catch(e){console.error(e);toast((e.message||'').includes('المخزون')?'لا يمكن التسليم: المخزون غير كافٍ':'تعذر إتمام التسليم');return false}
}

function renderBusinessMetrics(){
  const revenue=invoices.reduce((s,x)=>s+Number(x.revenue),0),cogs=invoices.reduce((s,x)=>s+Number(x.cost),0),expenseTotal=expenses.reduce((s,x)=>s+Number(x.amount),0),cash=transactions.filter(x=>x.kind!=='cogs').reduce((s,x)=>s+Number(x.amount),0),net=revenue-cogs-expenseTotal;
  const admin=$$('#admin .admin-metrics article');
  if(admin.length){admin[0].querySelector('span').textContent='إجمالي المبيعات المسلّمة';admin[0].querySelector('b').innerHTML=money(revenue);admin[0].querySelector('small').textContent=invoices.length+' فاتورة بيع';admin[1].querySelector('span').textContent='الطلبات الجديدة';admin[1].querySelector('b').textContent=orders.filter(o=>o.status!=='تم التسليم').length;admin[1].querySelector('small').textContent='تحتاج متابعة';admin[2].querySelector('span').textContent='منتجات منخفضة';admin[2].querySelector('b').textContent=products.filter(p=>p.stock<=2).length;admin[2].querySelector('small').textContent='حد التنبيه: 2';admin[3].querySelector('span').textContent='رصيد الخزنة';admin[3].querySelector('b').innerHTML=money(cash);admin[3].querySelector('small').textContent='لا يشمل ديون الموردين'}
  const driverMetrics=$$('#driver .metric-grid article');
  if(driverMetrics.length){driverMetrics[0].querySelector('b').textContent=orders.length;driverMetrics[1].querySelector('b').textContent=orders.filter(o=>o.status==='في الطريق').length;driverMetrics[2].querySelector('b').textContent=orders.filter(o=>o.status==='تم التسليم').length;driverMetrics[3].querySelector('b').innerHTML=money(revenue)}
  const recent=$('#admin .admin-grid tbody');if(recent)recent.innerHTML=orders.length?orders.slice(-5).reverse().map(o=>`<tr><td>${o.id}</td><td>${o.customerName}</td><td>${money(o.total)}</td><td><span class="status new">${o.status}</span></td></tr>`).join(''):'<tr><td colspan="4" class="empty-cell">لا توجد طلبات</td></tr>';
  const stockBox=$('#admin .stock');if(stockBox)stockBox.innerHTML=`<div class="panel-head"><div><small>تنبيه المخزون</small><h2>يحتاج متابعة</h2></div></div>`+(products.filter(p=>p.stock<=2).length?products.filter(p=>p.stock<=2).map(p=>`<div class="stock-row"><span>${p.icon}</span><div><b>${p.name}</b><small>متبقي ${p.stock} ${p.unit}</small></div></div>`).join(''):'<div class="data-empty compact"><b>المخزون جيد</b><span>لا توجد منتجات عند حد التنبيه.</span></div>');
  return {revenue,cogs,expenseTotal,cash,net};
}

renderDriverOrders=function(){
  const box=$('#driverOrders');if(!box)return;
  const active=orders.filter(o=>o.status!=='تم التسليم').slice().reverse();
  box.innerHTML=active.length?active.map(o=>`<article class="delivery-card"><div><small>${o.id}</small><h3>${o.customerName}</h3><p>${o.area} — ${o.address||'لا يوجد عنوان تفصيلي'}</p><span>${o.phone}</span></div><div><b>${money(o.total)}</b><span class="status new">${o.status}</span><button class="primary small" data-driver-delivered="${o.dbId}">تم التسليم والحساب</button></div></article>`).join(''):'<div class="data-empty"><b>لا توجد طلبات توصيل</b><span>ستظهر هنا الطلبات غير المسلّمة.</span></div>';
  $$('[data-driver-delivered]').forEach(b=>b.onclick=async()=>{b.disabled=true;await completeOrder(b.dataset.driverDelivered);renderDriverOrders()});
};

const v8ModuleHTML=moduleHTML;
moduleHTML=function(name,type){
  const common=`<div class="module-top"><div><small>${type==='admin'?'الإدارة':'المندوب'}</small><h1>${name}</h1></div><button class="outline" data-back-home>العودة للرئيسية</button></div>`;
  if(name==='المندوبون')return common+`<div class="module-toolbar"><button class="primary small" id="newDriver">+ إضافة مندوب</button><input id="driverSearch" placeholder="بحث باسم المندوب"></div><section class="record-grid" id="driversList"></section>`;
  if(name==='الموردون')return common+`<div class="module-toolbar"><button class="primary small" id="newSupplier">+ إضافة مورد</button><button class="outline" id="newPurchase">تسجيل شراء مخزون</button></div><section class="panel"><table><thead><tr><th>المورد</th><th>الهاتف</th><th>العملة</th><th>الرصيد المستحق</th></tr></thead><tbody id="suppliersList"></tbody></table></section>`;
  if(name==='الحسابات')return common+`<div class="account-summary module-summary" id="financeSummary"></div><div class="module-toolbar"><button class="primary small" id="newExpense">+ مصروف جديد</button><button class="outline" id="openingBalance">إضافة رصيد/رأس مال</button><button class="outline" id="printFinance">طباعة الحسابات</button></div><section class="panel"><table><thead><tr><th>التاريخ</th><th>النوع</th><th>البيان</th><th>التأثير على الخزنة</th></tr></thead><tbody id="financeRows"></tbody></table></section>`;
  if(name==='الطلبات المكتملة')return common+`<section class="panel"><table><thead><tr><th>الفاتورة</th><th>الطلب</th><th>المبيعات</th><th>التكلفة</th><th>الربح</th></tr></thead><tbody id="completedRows"></tbody></table></section>`;
  if(name==='سجل التحصيل')return common+`<div class="account-summary module-summary" id="collectionSummary"></div><section class="panel"><table><thead><tr><th>التاريخ</th><th>البيان</th><th>المبلغ</th></tr></thead><tbody id="collectionRows"></tbody></table></section>`;
  if(name==='مناطق التوصيل')return common+`<section class="panel"><div class="module-toolbar"><button class="primary small" id="startRoute">بدء خط الطلبات الحالية</button></div><div id="routeRows"></div></section>`;
  if(name==='الإعدادات')return common+`<div class="settings-grid"><article><h3>مناطق التوصيل</h3><p>تُدار من قسم المنتجات والمخزون.</p><button class="outline" data-open-manager>إدارة المناطق</button></article><article><h3>بيانات الاتصال</h3><p>أدخل رقم واتساب المستخدم في المتجر.</p><button class="outline" id="setWhatsapp">ضبط واتساب</button></article><article><h3>نسخة البيانات</h3><p>طباعة تقرير شامل للحفظ.</p><button class="outline" id="printAll">طباعة التقرير</button></article></div>`;
  return v8ModuleHTML(name,type);
};

const v8Hydrate=hydrateModule;
hydrateModule=function(name,m){
  v8Hydrate(name,m);
  if(name==='الطلبات'){const create=m.querySelector('.module-toolbar button');if(create){create.textContent='+ إنشاء طلب من المتجر';create.onclick=()=>showView('store')}const search=m.querySelector('.module-toolbar input');if(search)search.oninput=e=>{const q=e.target.value.trim();m.querySelectorAll('tbody tr').forEach(r=>r.style.display=!q||r.textContent.includes(q)?'':'none')};$$('[data-status-id]').forEach(b=>{if(b.dataset.status==='تم التسليم')b.onclick=async()=>{b.disabled=true;if(await completeOrder(b.dataset.statusId))hydrateModule('الطلبات',m)}})}
  if(name==='العملاء'){const add=m.querySelector('.module-toolbar button'),search=m.querySelector('.module-toolbar input');if(add)add.onclick=()=>entryModal('إضافة عميل',[['customerName','اسم العميل'],['customerPhone','رقم الهاتف'],['customerEmail','البريد الإلكتروني']],async()=>{await db('customers',{method:'POST',body:JSON.stringify({name:$('#customerName').value.trim(),phone:$('#customerPhone').value.trim(),email:$('#customerEmail').value.trim()})});await syncAll();closeModal();hydrateModule(name,m)});if(search)search.oninput=e=>{const q=e.target.value.trim();m.querySelectorAll('tbody tr').forEach(r=>r.style.display=!q||r.textContent.includes(q)?'':'none')}}
  if(name==='المندوبون'){const draw=(q='')=>$('#driversList').innerHTML=drivers.filter(x=>x.name.includes(q)).map(x=>`<article><h3>${x.name}</h3><p>${x.phone||'بدون هاتف'}</p><small>${(x.areas||[]).join('، ')||'كل المناطق'}</small><button class="danger" data-delete-driver="${x.id}">حذف</button></article>`).join('')||'<div class="data-empty"><b>لا يوجد مندوبون</b></div>';draw();$('#driverSearch').oninput=e=>draw(e.target.value);$('#newDriver').onclick=()=>entryModal('إضافة مندوب',[['driverName','اسم المندوب'],['driverPhone','رقم الهاتف'],['driverAreas','المناطق مفصولة بفاصلة']],async()=>{await db('drivers',{method:'POST',body:JSON.stringify({name:$('#driverName').value.trim(),phone:$('#driverPhone').value.trim(),areas:$('#driverAreas').value.split(',').map(x=>x.trim()).filter(Boolean)})});await loadBusinessData();closeModal();hydrateModule(name,m)});$$('[data-delete-driver]').forEach(b=>b.onclick=async()=>{await db('drivers?id=eq.'+b.dataset.deleteDriver,{method:'DELETE'});await loadBusinessData();hydrateModule(name,m)})}
  if(name==='الموردون'){renderSuppliers();$('#newSupplier').onclick=()=>entryModal('إضافة مورد',[['supplierName','اسم المورد'],['supplierPhone','رقم الهاتف']],async()=>{await db('suppliers',{method:'POST',body:JSON.stringify({name:$('#supplierName').value.trim(),phone:$('#supplierPhone').value.trim()})});await loadBusinessData();closeModal();hydrateModule(name,m)});$('#newPurchase').onclick=openPurchase}
  if(name==='الحسابات'){const f=renderBusinessMetrics(),debt=purchases.reduce((s,x)=>s+Number(x.total)-Number(x.paid),0);$('#financeSummary').innerHTML=`<article><span>المبيعات المسلّمة</span><b>${money(f.revenue)}</b></article><article><span>تكلفة المبيعات</span><b>${money(f.cogs)}</b></article><article><span>المصروفات</span><b>${money(f.expenseTotal)}</b></article><article><span>صافي الربح</span><b>${money(f.net)}</b></article><article><span>رصيد الخزنة</span><b>${money(f.cash)}</b></article><article><span>ديون الموردين</span><b>${money(debt)}</b></article>`;$('#financeRows').innerHTML=transactions.length?transactions.map(x=>`<tr><td>${new Date(x.created_at).toLocaleString('ar')}</td><td>${x.kind}</td><td>${x.description}</td><td>${x.kind==='cogs'?'لا يؤثر نقديًا — '+money(x.amount):money(x.amount)}</td></tr>`).join(''):'<tr><td colspan="4" class="empty-cell">لا توجد حركات</td></tr>';$('#newExpense').onclick=openExpense;$('#openingBalance').onclick=openOpeningBalance;$('#printFinance').onclick=()=>window.print()}
  if(name==='الطلبات المكتملة')$('#completedRows').innerHTML=invoices.length?invoices.map(x=>`<tr><td>${x.invoice_number}</td><td>${orders.find(o=>o.dbId===x.order_id)?.id||'—'}</td><td>${money(x.revenue)}</td><td>${money(x.cost)}</td><td>${money(x.profit)}</td></tr>`).join(''):'<tr><td colspan="5" class="empty-cell">لا توجد فواتير بيع</td></tr>';
  if(name==='سجل التحصيل'){const sales=transactions.filter(x=>x.kind==='sale');$('#collectionSummary').innerHTML=`<article><span>إجمالي المحصل</span><b>${money(sales.reduce((s,x)=>s+Number(x.amount),0))}</b></article><article><span>عدد عمليات البيع</span><b>${sales.length}</b></article>`;$('#collectionRows').innerHTML=sales.length?sales.map(x=>`<tr><td>${new Date(x.created_at).toLocaleString('ar')}</td><td>${x.description}</td><td>${money(x.amount)}</td></tr>`).join(''):'<tr><td colspan="3" class="empty-cell">لا توجد تحصيلات</td></tr>'}
  if(name==='مناطق التوصيل'){const draw=()=>$('#routeRows').innerHTML=orders.filter(o=>o.status!=='تم التسليم').map(o=>`<article class="delivery-card"><div><b>${o.id} — ${o.customerName}</b><p>${o.area}، ${o.address||''}</p></div><span>${o.status}</span></article>`).join('')||'<div class="data-empty"><b>لا توجد طلبات حالية</b></div>';draw();$('#startRoute').onclick=async()=>{const ready=orders.filter(o=>o.status==='يتم التجهيز'||o.status==='طلب جديد');await Promise.all(ready.map(o=>db('orders?id=eq.'+o.dbId,{method:'PATCH',body:JSON.stringify({status:'في الطريق'})})));await syncAll();draw();toast('تم تحويل الطلبات الحالية إلى في الطريق')}}
  if(name==='الإعدادات'){$('#setWhatsapp').onclick=()=>entryModal('رقم واتساب',[['waNumber','الرقم بكود الدولة دون +']],()=>{localStorage.setItem('qitaf_whatsapp',$('#waNumber').value.trim());closeModal();toast('تم حفظ رقم واتساب')});$('#printAll').onclick=()=>window.print()}
};

function entryModal(title,fields,onSave){modal(title,'أكمل البيانات المطلوبة.',fields.map(([id,label,type='text'])=>`<div class="form-row"><label>${label}</label><input id="${id}" type="${type}"></div>`).join('')+'<button class="primary full" id="entrySave">حفظ</button>','+');$('#modalOk').style.display='none';$('#entrySave').onclick=onSave}
function renderSuppliers(){const debtBy=id=>purchases.filter(x=>x.supplier_id===id).reduce((s,x)=>s+Number(x.total)-Number(x.paid),0);$('#suppliersList').innerHTML=suppliers.length?suppliers.map(x=>`<tr><td>${x.name}</td><td>${x.phone||'—'}</td><td>${x.currency}</td><td>${money(debtBy(x.id))}</td></tr>`).join(''):'<tr><td colspan="4" class="empty-cell">لا يوجد موردون</td></tr>'}
function openExpense(){entryModal('تسجيل مصروف',[['expenseTitle','بيان المصروف'],['expenseAmount','المبلغ','number'],['expenseNotes','ملاحظات']],async()=>{await rpc('record_expense',{p_title:$('#expenseTitle').value.trim(),p_amount:Number($('#expenseAmount').value),p_notes:$('#expenseNotes').value.trim()});await loadBusinessData();closeModal();toast('تم تسجيل المصروف وخصمه من صافي الربح')})}
function openOpeningBalance(){entryModal('إضافة رصيد أو رأس مال',[['capitalTitle','البيان'],['capitalAmount','المبلغ','number']],async()=>{await db('financial_transactions',{method:'POST',body:JSON.stringify({kind:'capital',description:$('#capitalTitle').value.trim()||'رصيد افتتاحي',amount:Number($('#capitalAmount').value)})});await loadBusinessData();closeModal();toast('تمت إضافة الرصيد للخزنة دون اعتباره ربحًا')})}
function openPurchase(){modal('تسجيل شراء مخزون','الشراء يزيد المخزون، والمدفوع فقط يخرج من الخزنة.',`<div class="form-row"><label>المورد</label><select id="purchaseSupplier">${suppliers.map(x=>`<option value="${x.id}">${x.name}</option>`)}</select></div><div class="form-row"><label>المنتج</label><select id="purchaseProduct">${products.map(x=>`<option value="${x.id}">${x.name}</option>`)}</select></div><div class="split"><div class="form-row"><label>الكمية</label><input id="purchaseQty" type="number"></div><div class="form-row"><label>تكلفة الوحدة</label><input id="purchaseCost" type="number"></div></div><div class="form-row"><label>المدفوع للمورد</label><input id="purchasePaid" type="number" value="0"></div><button class="primary full" id="savePurchase">حفظ الشراء</button>`,'+');$('#modalOk').style.display='none';$('#savePurchase').onclick=async()=>{await rpc('record_purchase',{p_supplier_id:$('#purchaseSupplier').value,p_product_id:$('#purchaseProduct').value,p_quantity:Number($('#purchaseQty').value),p_unit_cost:Number($('#purchaseCost').value),p_paid:Number($('#purchasePaid').value)});await Promise.all([syncAll(),loadBusinessData()]);closeModal();toast('تمت إضافة الشراء والمخزون والدين')}}

// وظائف الأزرار العامة بدل رسائل المراحل التجريبية.
document.querySelector('[data-action="search"]').onclick=()=>entryModal('البحث عن منتج',[['searchText','اسم المنتج']],()=>{const q=$('#searchText').value.trim();closeModal();selectedCategory=null;const found=products.filter(p=>p.name.includes(q));$('#productGrid').innerHTML=found.length?found.map(p=>`<article class="product-card"><div class="product-img">${p.imageUrl?`<img src="${p.imageUrl}" alt="${p.name}">`:p.icon}</div><div class="product-info"><h3>${p.name}</h3><button class="add" data-add="${p.id}">+ أضف</button></div></article>`).join(''):'<div class="data-empty"><b>لا توجد نتائج</b></div>';$$('[data-add]').forEach(b=>b.onclick=()=>{cart[b.dataset.add]=(cart[b.dataset.add]||0)+1;renderCart();toast('تمت إضافة المنتج')});$('#products').scrollIntoView({behavior:'smooth'})});
document.querySelector('[data-action="whatsapp"]').onclick=()=>{const n=localStorage.getItem('qitaf_whatsapp');if(!n)return toast('أضف رقم واتساب من الإعدادات');window.open('https://wa.me/'+n,'_blank','noopener')};
document.querySelector('[data-action="start-order"]').onclick=()=>$('#categories').scrollIntoView({behavior:'smooth'});
document.querySelector('[data-action="route"]').onclick=()=>openModule('driver','مناطق التوصيل');
$$('[data-action="logout"]').forEach(b=>b.remove());
$$('.filters button').forEach(b=>b.remove());
$$('.text-button').forEach(b=>b.onclick=()=>openModule('admin','الطلبات'));

const v8Sync=syncAll;
syncAll=async function(){await v8Sync();renderDriverOrders();renderBusinessMetrics()};
loadBusinessData();
