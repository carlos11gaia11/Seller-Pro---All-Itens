(function exposeSellerProAuthErrors(global) {
  'use strict';

  function diagnostics(error) {
    return {
      name: error?.name || '',
      message: error?.message || String(error || ''),
      code: error?.code || '',
      status: Number(error?.status) || 0,
      details: error?.details || '',
      hint: error?.hint || ''
    };
  }

  function translate(error) {
    const value = String(error?.message || error || '').toLowerCase();
    if (value.includes('already registered') || value.includes('already exists') || value.includes('user already registered')) return 'Este e-mail já está cadastrado.';
    if (value.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (value.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
    if (value.includes('password') && value.includes('weak')) return 'A senha informada não atende aos requisitos de segurança.';
    if (value.includes('rate limit') || value.includes('too many')) return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
    if (value.includes('network') || value.includes('fetch') || value.includes('failed to fetch')) return 'Não foi possível conectar ao Supabase. Verifique sua internet e tente novamente.';
    return error?.message || 'Não foi possível concluir a operação.';
  }

  global.SellerProAuthErrors = Object.freeze({ diagnostics, translate });
})(typeof window !== 'undefined' ? window : globalThis);
