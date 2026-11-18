function showVariant(id,btn){document.querySelectorAll('.variant').forEach(v=>v.style.display='none');document.querySelectorAll('.variant-tab').forEach(t=>t.classList.remove('active'));document.getElementById('variant-'+id).style.display='block';btn.classList.add('active');try{localStorage.setItem('v'+location.pathname,id)}catch(e){}}
function setTheme(n){document.getElementById('theme').href='../themes/'+n+'.css';try{localStorage.setItem('theme',n)}catch(e){}}
(function(){try{var t=localStorage.getItem('theme');if(t){document.getElementById('theme').href='../themes/'+t+'.css';var s=document.getElementById('themesel');if(s)s.value=t}}catch(e){}})();
function pickNav(el){el.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('on'));if(!el.classList.contains('plus'))el.classList.add('on')}
function toggle(id){var e=document.getElementById(id);e.style.display=getComputedStyle(e).display==='none'?'block':'none'}
