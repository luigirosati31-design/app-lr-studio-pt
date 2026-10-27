export function accessError(code,message){return Object.assign(new Error(message),{code});}
export function loginFailure(error){
 const status=error?.context?.status||error?.status;
 if(status===429)return accessError('rate_limited','Troppi tentativi. Attendi qualche minuto e riprova.');
 if(status===400||status===401)return accessError('invalid_credentials','Nome utente o PIN/password non corretti. Controlla e riprova.');
 if(status===403)return accessError('access_denied','Accesso non consentito. Contatta Luigi.');
 if(status>=500||error?.name==='FunctionsRelayError')return accessError('service_unavailable','Il servizio di accesso è temporaneamente non disponibile. Riprova tra poco.');
 if(error?.name==='FunctionsFetchError'||error?.name==='AuthRetryableFetchError'||error instanceof TypeError||globalThis.navigator?.onLine===false)return accessError('connection','Impossibile raggiungere il servizio. Controlla la connessione e riprova.');
 return accessError('service_unavailable','Il servizio di accesso è temporaneamente non disponibile. Riprova tra poco.');
}
