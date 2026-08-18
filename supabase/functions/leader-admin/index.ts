import { createClient } from "npm:@supabase/supabase-js@2";

const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const SUPPORTS='suportes_sellerpro', SELLERS='sellers', MODERN='support_profiles', LEGACY='profiles';
class HttpError extends Error{constructor(public status:number,message:string){super(message)}}
const out=(status:number,body:any)=>new Response(JSON.stringify(body),{status,headers:{...H,"Content-Type":"application/json; charset=utf-8"}});
const norm=(v:any)=>String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[-\s]+/g,'_');
const email=(v:any)=>String(v??'').trim().toLowerCase();
const isLeaderRole=(v:any)=>['lider','lider_suporte','suporte_lider','mentor_lider','leader','gestor','admin','administrador'].includes(norm(v));
const active=(v:any)=>!['inativo','inactive','false','0','nao'].includes(norm(v));
function text(v:any,label:string,max=200){const s=String(v??'').trim();if(!s)throw new HttpError(400,`${label} é obrigatório.`);if(s.length>max)throw new HttpError(400,`${label} excede o limite permitido.`);return s}
function opt(v:any,max=300){const s=String(v??'').trim();if(!s)return null;if(s.length>max)throw new HttpError(400,'Um dos campos excede o limite permitido.');return s}
function role(v:any){const r=norm(v||'suporte');if(!['suporte','lider_suporte','admin'].includes(r))throw new HttpError(400,'Cargo inválido.');return r}
function status(v:any){const s=norm(v||'ativo');if(!['ativo','inativo','em_andamento','pendente'].includes(s))throw new HttpError(400,'Status inválido.');return s}

async function callerLeader(req:Request,admin:any){
  const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
  if(!token)throw new HttpError(401,'Sessão não informada.');
  const {data,error}=await admin.auth.getUser(token), user=data?.user;
  if(error||!user)throw new HttpError(401,'Sessão inválida ou expirada.');
  let r=user.app_metadata?.cargo||user.app_metadata?.role||user.app_metadata?.funcao||user.app_metadata?.seller_pro_role||'';
  if(!isLeaderRole(r)){
    const q=await admin.from(MODERN).select('cargo').eq('user_id',user.id).maybeSingle();
    if(q.error)throw new HttpError(500,`Falha ao validar permissão moderna: ${q.error.message}`);r=q.data?.cargo||'';
  }
  if(!isLeaderRole(r)){
    const q=await admin.from(LEGACY).select('cargo,status').or(`id.eq.${user.id},user_id.eq.${user.id}`).limit(1).maybeSingle();
    if(q.error)throw new HttpError(500,`Falha ao validar permissão legada: ${q.error.message}`);
    if(q.data&&!active(q.data.status))throw new HttpError(403,'O perfil de liderança está inativo.');r=q.data?.cargo||'';
  }
  if(!isLeaderRole(r))throw new HttpError(403,'Acesso restrito à liderança.');
  return user;
}

async function authByEmail(admin:any,target:string){
  target=email(target);if(!target)return null;
  for(let page=1;page<=10;page++){const q=await admin.auth.admin.listUsers({page,perPage:1000});if(q.error)throw new HttpError(500,`Falha ao consultar usuários: ${q.error.message}`);const u=(q.data?.users||[]).find((x:any)=>email(x.email)===target);if(u)return u;if((q.data?.users||[]).length<1000)break}return null;
}
async function linkedUser(admin:any,s:any,target=''){
  if(s?.user_id){const q=await admin.auth.admin.getUserById(s.user_id);if(!q.error&&q.data?.user)return q.data.user}
  const e=email(target||s?.email);if(e){const p=await admin.from(MODERN).select('user_id').ilike('email',e).maybeSingle();if(!p.error&&p.data?.user_id){const q=await admin.auth.admin.getUserById(p.data.user_id);if(!q.error&&q.data?.user)return q.data.user}}
  return authByEmail(admin,e);
}
async function sync(admin:any,userId:string,s:any){
  const au=await admin.auth.admin.getUserById(userId);if(au.error)throw new HttpError(500,`Falha ao consultar acesso vinculado: ${au.error.message}`);
  const meta=au.data?.user?.app_metadata||{};const m=await admin.auth.admin.updateUserById(userId,{app_metadata:{...meta,cargo:s.cargo,seller_pro_role:s.cargo}});if(m.error)throw new HttpError(500,`Falha ao atualizar permissão do usuário: ${m.error.message}`);
  const p=await admin.from(MODERN).upsert({user_id:userId,email:s.email,nome:s.nome,cargo:s.cargo,telefone:s.telefone||null},{onConflict:'user_id'});if(p.error)throw new HttpError(500,`Falha ao sincronizar perfil moderno: ${p.error.message}`);
  const legacyCargo=isLeaderRole(s.cargo)?'Suporte Lider':'Suporte N1';
  const l=await admin.from(LEGACY).upsert({id:userId,user_id:userId,email:s.email,nome:s.nome,cargo:legacyCargo,telefone:s.telefone||null,status:s.status||'ativo',updated_at:new Date().toISOString()},{onConflict:'id'});if(l.error)throw new HttpError(500,`Falha ao sincronizar perfil legado: ${l.error.message}`);
}
async function audit(admin:any,user:any,action:string,target:string|null,details:any={}){try{await admin.from('leader_admin_audit').insert({actor_user_id:user.id,actor_email:user.email||null,action,target_type:'support_admin',target_id:target,details})}catch(e){console.warn('Falha ao gravar auditoria',e)}}

async function dashboard(admin:any){
  const [a,b,c,d]=await Promise.all([admin.from(SUPPORTS).select('*').order('nome',{ascending:true}),admin.from(SELLERS).select('*'),admin.from(MODERN).select('*'),admin.from(LEGACY).select('id,user_id,email,nome,cargo,status')]);
  for(const q of [a,b,c,d])if(q.error)throw new HttpError(500,q.error.message);
  const byEmail=new Map();for(const p of [...(d.data||[]),...(c.data||[])])if(email(p.email))byEmail.set(email(p.email),p);
  const supports=(a.data||[]).map((s:any)=>{const p=byEmail.get(email(s.email)) as any;return {...s,user_id:s.user_id||p?.user_id||p?.id||null,cargo:s.cargo||p?.cargo||'suporte'}});
  const byName=new Map(supports.map((s:any)=>[norm(s.nome),s]));
  const sellers=(b.data||[]).map((x:any)=>({...x,suporte_id:x.suporte_id||(byName.get(norm(x.suporte)) as any)?.id||null}));
  return {supports,sellers};
}

async function listAuthUsers(admin:any){
  const users:any[]=[];
  for(let page=1;page<=20;page++){
    const q=await admin.auth.admin.listUsers({page,perPage:500});
    if(q.error)throw new HttpError(500,`Falha ao listar usuários Auth: ${q.error.message}`);
    const batch=q.data?.users||[];
    users.push(...batch.map((u:any)=>({
      id:u.id,
      email:u.email||null,
      name:u.user_metadata?.nome||u.user_metadata?.nome_completo||null,
      created_at:u.created_at||null,
      last_sign_in_at:u.last_sign_in_at||null
    })));
    if(batch.length<500)break;
  }
  users.sort((a,b)=>String(a.email||a.name||a.id).localeCompare(String(b.email||b.name||b.id),'pt-BR'));
  return {users};
}

async function saveSupport(admin:any,user:any,body:any){
  const i=body.support||{}, id=i.id?String(i.id):'';
  const s={nome:text(i.nome,'Nome',90),email:email(text(i.email,'E-mail',160)),telefone:opt(i.telefone,30),cargo:role(i.cargo),status:status(i.status)};const password=String(i.password||'');if(password&&password.length<8)throw new HttpError(400,'A senha temporária deve ter pelo menos 8 caracteres.');
  let current:any=null;if(id){const q=await admin.from(SUPPORTS).select('*').eq('id',id).maybeSingle();if(q.error)throw new HttpError(500,q.error.message);if(!q.data)throw new HttpError(404,'Suporte não encontrado.');current=q.data}
  let au=await linkedUser(admin,current,current?.email||s.email);if(au?.id===user.id&&!isLeaderRole(s.cargo))throw new HttpError(400,'Você não pode remover seu próprio cargo de liderança por esta tela.');
  if(au&&(email(au.email)!==s.email||password)){const changes:any={email:s.email,email_confirm:true};if(password)changes.password=password;const q=await admin.auth.admin.updateUserById(au.id,changes);if(q.error)throw new HttpError(500,`Falha ao atualizar login: ${q.error.message}`);au=q.data?.user||au}
  else if(!au&&password){const q=await admin.auth.admin.createUser({email:s.email,password,email_confirm:true,app_metadata:{cargo:s.cargo,seller_pro_role:s.cargo},user_metadata:{nome:s.nome}});if(q.error)throw new HttpError(500,`Falha ao criar login: ${q.error.message}`);au=q.data?.user}
  const payload:any={...s,ativo:s.status!=='inativo',user_id:au?.id||current?.user_id||null,updated_at:new Date().toISOString()};let q;
  if(id)q=await admin.from(SUPPORTS).update(payload).eq('id',id).select('*').single();else q=await admin.from(SUPPORTS).insert({id:crypto.randomUUID(),...payload,created_at:new Date().toISOString()}).select('*').single();
  if(q.error)throw new HttpError(500,`Falha ao salvar suporte: ${q.error.message}`);if(au?.id)await sync(admin,au.id,payload);await audit(admin,user,'save_support',String(q.data.id),{cargo:s.cargo,status:s.status});return {support:q.data};
}

async function saveAccess(admin:any,user:any,body:any){
  const id=text(body.support_id,'Suporte',80), newEmail=body.email?email(text(body.email,'E-mail',160)):'', password=String(body.password||'');if(password&&password.length<8)throw new HttpError(400,'A nova senha deve ter pelo menos 8 caracteres.');
  const q=await admin.from(SUPPORTS).select('*').eq('id',id).maybeSingle();if(q.error||!q.data)throw new HttpError(404,'Suporte não encontrado.');const s=q.data;let au=await linkedUser(admin,s,s.email);const target=newEmail||email(s.email);
  if(!au){if(!target||!password)throw new HttpError(400,'Para criar um novo acesso, informe e-mail e senha.');const c=await admin.auth.admin.createUser({email:target,password,email_confirm:true,app_metadata:{cargo:role(s.cargo),seller_pro_role:role(s.cargo)},user_metadata:{nome:s.nome||''}});if(c.error)throw new HttpError(500,c.error.message);au=c.data?.user}
  else {const ch:any={};if(newEmail){ch.email=newEmail;ch.email_confirm=true}if(password)ch.password=password;if(Object.keys(ch).length){const u=await admin.auth.admin.updateUserById(au.id,ch);if(u.error)throw new HttpError(500,u.error.message);au=u.data?.user||au}}
  if(!au?.id)throw new HttpError(500,'Não foi possível vincular o usuário ao suporte.');const final={...s,email:target,user_id:au.id,cargo:role(s.cargo),status:status(s.status||'ativo')};const u=await admin.from(SUPPORTS).update({email:target,user_id:au.id,updated_at:new Date().toISOString()}).eq('id',id);if(u.error)throw new HttpError(500,u.error.message);await sync(admin,au.id,final);await audit(admin,user,'save_access',id,{email_changed:!!newEmail,password_changed:!!password});return {user_id:au.id,email:target};
}

async function chooseSupport(admin:any,id:string){const d=await dashboard(admin);const candidates=d.supports.filter((s:any)=>active(s.status)&&!isLeaderRole(s.cargo));if(id&&id!=='__auto__'){const s=candidates.find((x:any)=>String(x.id)===String(id));if(!s)throw new HttpError(400,'O suporte selecionado não está disponível.');return s}const counts=new Map();for(const x of d.sellers){const k=String(x.suporte_id||'');if(k)counts.set(k,(counts.get(k)||0)+1)}const s=candidates.map((x:any)=>({x,n:counts.get(String(x.id))||0})).sort((a:any,b:any)=>a.n-b.n||String(a.x.nome).localeCompare(String(b.x.nome),'pt-BR'))[0]?.x;if(!s)throw new HttpError(400,'Nenhum suporte ativo disponível.');return s}
async function createSeller(admin:any,user:any,body:any){const i=body.seller||{},s=await chooseSupport(admin,String(i.support_id||'__auto__'));const p={nome:text(i.nome,'Nome do seller',120),email:i.email?email(i.email):null,telefone:opt(i.telefone,30),mcid:opt(i.mcid,80),status:status(i.status),data_inicio:new Date().toISOString().slice(0,10),suporte:s.nome,suporte_id:s.id};const q=await admin.from(SELLERS).insert(p).select('*').single();if(q.error)throw new HttpError(500,q.error.message);await audit(admin,user,'create_seller',String(q.data.id),{support_id:s.id});return {seller:q.data}}
async function assignSeller(admin:any,user:any,body:any){const sid=text(body.seller_id,'Seller',100),s=await chooseSupport(admin,text(body.support_id,'Suporte',80));const q=await admin.from(SELLERS).update({suporte:s.nome,suporte_id:s.id}).eq('id',sid);if(q.error)throw new HttpError(500,q.error.message);await audit(admin,user,'assign_seller',sid,{support_id:s.id});return {seller_id:sid,support_id:s.id}}


async function resetUnlinkedUserRole(admin:any,userId:string){
  const q=await admin.auth.admin.getUserById(userId);
  if(!q.error&&q.data?.user){
    const meta=q.data.user.app_metadata||{};
    const u=await admin.auth.admin.updateUserById(userId,{app_metadata:{...meta,cargo:'suporte',seller_pro_role:'suporte'}});
    if(u.error)throw new HttpError(500,`Falha ao remover permissão do usuário desvinculado: ${u.error.message}`);
  }
  const modern=await admin.from(MODERN).update({cargo:'suporte',updated_at:new Date().toISOString()}).eq('user_id',userId);
  if(modern.error)throw new HttpError(500,`Falha ao atualizar perfil do usuário desvinculado: ${modern.error.message}`);
  const legacy=await admin.from(LEGACY).update({cargo:'Suporte N1',updated_at:new Date().toISOString()}).or(`id.eq.${userId},user_id.eq.${userId}`);
  if(legacy.error)throw new HttpError(500,`Falha ao atualizar perfil legado desvinculado: ${legacy.error.message}`);
}

async function linkAuthUser(admin:any,user:any,body:any){
  const supportId=text(body.support_id,'Suporte',100),userId=text(body.user_id,'Usuário Auth',100);
  const supportQuery=await admin.from(SUPPORTS).select('*').eq('id',supportId).maybeSingle();
  if(supportQuery.error||!supportQuery.data)throw new HttpError(404,'Suporte não encontrado.');
  const support=supportQuery.data;
  const authQuery=await admin.auth.admin.getUserById(userId);
  if(authQuery.error||!authQuery.data?.user)throw new HttpError(404,'Usuário Auth não encontrado.');
  const target=authQuery.data.user;
  const duplicate=await admin.from(SUPPORTS).select('id,nome').eq('user_id',userId).neq('id',supportId).limit(1).maybeSingle();
  if(duplicate.error)throw new HttpError(500,`Falha ao validar vínculo Auth: ${duplicate.error.message}`);
  if(duplicate.data)throw new HttpError(409,`Este usuário Auth já está vinculado ao suporte ${duplicate.data.nome||duplicate.data.id}.`);
  const currentUserId=support.user_id?String(support.user_id):'';
  if(currentUserId&&currentUserId!==userId&&!body.replace)throw new HttpError(409,'Este suporte já possui outro usuário Auth vinculado. Desvincule primeiro ou confirme a substituição.');
  if(currentUserId&&currentUserId!==userId)await resetUnlinkedUserRole(admin,currentUserId);
  const finalEmail=email(target.email||support.email);
  if(!finalEmail)throw new HttpError(400,'O usuário Auth selecionado não possui e-mail válido.');
  const finalSupport={...support,email:finalEmail,user_id:userId,cargo:role(support.cargo||'suporte'),status:status(support.status||'ativo')};
  const update=await admin.from(SUPPORTS).update({user_id:userId,email:finalEmail,updated_at:new Date().toISOString()}).eq('id',supportId);
  if(update.error)throw new HttpError(500,`Falha ao vincular usuário Auth: ${update.error.message}`);
  await sync(admin,userId,finalSupport);
  await audit(admin,user,'link_auth_user',supportId,{user_id:userId,replaced_user_id:currentUserId&&currentUserId!==userId?currentUserId:null});
  return {support_id:supportId,user_id:userId,email:finalEmail};
}

async function unlinkAuthUser(admin:any,user:any,body:any){
  const supportId=text(body.support_id,'Suporte',100);
  const q=await admin.from(SUPPORTS).select('*').eq('id',supportId).maybeSingle();
  if(q.error||!q.data)throw new HttpError(404,'Suporte não encontrado.');
  const support=q.data,userId=support.user_id?String(support.user_id):'';
  if(!userId)return {support_id:supportId,unlinked:false,message:'Este suporte já está sem vínculo Auth.'};
  if(userId===user.id)throw new HttpError(400,'Você não pode desvincular a própria conta de liderança enquanto está autenticado nela.');
  const update=await admin.from(SUPPORTS).update({user_id:null,updated_at:new Date().toISOString()}).eq('id',supportId);
  if(update.error)throw new HttpError(500,`Falha ao remover vínculo Auth: ${update.error.message}`);
  await resetUnlinkedUserRole(admin,userId);
  await audit(admin,user,'unlink_auth_user',supportId,{user_id:userId});
  return {support_id:supportId,user_id:userId,unlinked:true,message:'Vínculo removido; a conta Auth foi preservada com permissão de suporte.'};
}

async function deleteSupport(admin:any,user:any,body:any){
  const id=text(body.support_id,'Suporte',100),q=await admin.from(SUPPORTS).select('*').eq('id',id).maybeSingle();if(q.error||!q.data)throw new HttpError(404,'Suporte não encontrado.');const s=q.data,au=await linkedUser(admin,s,s.email);if(au?.id===user.id)throw new HttpError(400,'Você não pode excluir ou desativar o próprio cadastro de liderança.');
  const [a,b]=await Promise.all([admin.from(SELLERS).select('id',{count:'exact',head:true}).eq('suporte_id',id),admin.from(SELLERS).select('id',{count:'exact',head:true}).eq('suporte',s.nome||'')]);if(a.error||b.error)throw new HttpError(500,'Falha ao verificar sellers vinculados.');const n=Math.max(Number(a.count||0),Number(b.count||0));
  if(n>0||au?.id){const u=await admin.from(SUPPORTS).update({status:'inativo',ativo:false,updated_at:new Date().toISOString()}).eq('id',id);if(u.error)throw new HttpError(500,u.error.message);if(au?.id)await admin.from(LEGACY).update({status:'inativo',updated_at:new Date().toISOString()}).or(`id.eq.${au.id},user_id.eq.${au.id}`);await audit(admin,user,'delete_support',id,{soft_deleted:true,sellers_linked:n});return {soft_deleted:true,status:'inativo',sellers_linked:n,message:'Suporte desativado para preservar vínculos e histórico.'}}
  const d=await admin.from(SUPPORTS).delete().eq('id',id);if(d.error)throw new HttpError(500,d.error.message);await audit(admin,user,'delete_support',id,{soft_deleted:false});return {soft_deleted:false,deleted:true,sellers_linked:0,message:'Suporte excluído com sucesso.'};
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:H});if(req.method!=='POST')return out(405,{ok:false,error:'Método não permitido.'});
  try{const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)throw new HttpError(500,'Configuração administrativa do Supabase ausente.');const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),user=await callerLeader(req,admin),body=await req.json().catch(()=>({})),action=String(body.action||'');let result:any;
    switch(action){case 'dashboard':result=await dashboard(admin);break;case 'list_auth_users':result=await listAuthUsers(admin);break;case 'save_support':result=await saveSupport(admin,user,body);break;case 'save_access':result=await saveAccess(admin,user,body);break;case 'link_auth_user':result=await linkAuthUser(admin,user,body);break;case 'unlink_auth_user':result=await unlinkAuthUser(admin,user,body);break;case 'create_seller':result=await createSeller(admin,user,body);break;case 'assign_seller':result=await assignSeller(admin,user,body);break;case 'delete_support':result=await deleteSupport(admin,user,body);break;default:throw new HttpError(400,'Ação administrativa desconhecida.')}
    return out(200,{ok:true,...result});
  }catch(e:any){console.error('[leader-admin]',e);return out(e instanceof HttpError?e.status:500,{ok:false,error:e?.message||'Erro administrativo inesperado.'})}
});
