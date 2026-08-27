(function(){
  const url='https://nqlevjwzumkuftimwipk.supabase.co/rest/v1/platform_settings?id=eq.1&select=*';
  const key='sb_publishable_TIeEXqXUPHuc6hQ_EXt7zA_9jizK750';
  window.loadBranding=async function(){
    try{
      const response=await fetch(url,{headers:{apikey:key,Authorization:'Bearer '+key}});
      if(!response.ok)return;
      const settings=(await response.json())[0];if(!settings)return;
      document.querySelectorAll('.brand b').forEach(x=>x.textContent=settings.platform_name);
      document.querySelectorAll('.brand small').forEach(x=>x.textContent=settings.business_name);
      if(settings.logo_url)document.querySelectorAll('.brand img,.account-cover img').forEach(x=>x.src=settings.logo_url);
      const footer=document.querySelector('footer>p');if(footer)footer.textContent=settings.footer_text;
      document.title=settings.platform_name+' | '+settings.business_name;
      window.qitafSettings=settings;
    }catch(error){console.error('Brand settings:',error)}
  };
  window.loadBranding();
})();
