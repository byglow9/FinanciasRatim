window.DOCK=[['home','Início'],['receipt','Transações'],['calendar','Calendário'],['repeat','Contas fixas'],['flag','Metas'],['pie-chart','Relatórios'],['users','Casal'],['piggy-bank','Porquinho']];
window.buildDock=function(host,variant,active,onPlus){
 host.className='dk dk-'+variant;
 host.innerHTML='<nav aria-label="Navegação principal">'+DOCK.map(function(d,i){return '<button class="it'+(i===active?' on':'')+'" data-i="'+i+'" aria-label="'+d[1]+'"'+(i===active?' aria-current="page"':'')+'><i data-lucide="'+d[0]+'"></i><span class="lbl">'+d[1]+'</span></button>'}).join('')+'</nav><button class="fab" aria-label="Novo lançamento"><i data-lucide="plus"></i></button>';
 var nav=host.querySelector('nav');
 function center(el,smooth){var l=el.offsetLeft-6,r=el.offsetLeft+el.offsetWidth+6,v0=nav.scrollLeft,v1=v0+nav.clientWidth;if(l>=v0&&r<=v1)return;nav.scrollTo({left:Math.max(0,l),behavior:smooth?'smooth':'auto'})}
 nav.addEventListener('click',function(e){var b=e.target.closest('.it');if(!b)return;nav.querySelectorAll('.it').forEach(function(x){x.classList.remove('on');x.removeAttribute('aria-current')});b.classList.add('on');b.setAttribute('aria-current','page');center(b,true);host.dispatchEvent(new CustomEvent('dockgo',{detail:+b.dataset.i}))});
 host.querySelector('.fab').addEventListener('click',function(){if(onPlus)onPlus()});
 if(window.lucide)lucide.createIcons();
 var a=nav.querySelector('.on');if(a)center(a,false);
};
