const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'motorista.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'js/motorista.js'), 'utf8');
const cfg = fs.readFileSync(path.join(root, 'js/config.firebase.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const version = 'jm-v32-7-4-motorista-assinatura-header';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(html.includes('id="driverPanelActive"'), 'Painel de atendimento atual ausente');
expect(html.includes('id="driverFieldNav"'), 'Navegação mobile de campo ausente');
expect(html.includes('id="driverNetworkStatus"'), 'Estado de conexão ausente');
expect(html.includes('id="driverPanelLocation"') && !/id="driverPanelLocation"[^>]*class="[^"]*hidden/.test(html), 'GPS ainda nasce escondido');
expect(!js.includes('activeCalls()[0] || null'), 'selectedCall ainda usa primeiro chamado automaticamente');
expect(!js.includes('if (!state.selectedCallId && activeCalls()[0])'), 'render ainda seleciona primeiro chamado automaticamente');
expect(js.includes('function setActiveCall('), 'setActiveCall ausente');
expect(js.includes('function requireActiveCall('), 'bloqueio sem atendimento ausente');
expect(js.includes('localStorage.setItem(activeCallStorageKey()'), 'persistência do atendimento ausente');
expect(js.includes('O GPS só pode ser vinculado ao atendimento atual selecionado'), 'GPS não está protegido pelo atendimento atual');
expect(js.includes('mobileGps/calls/'), 'RTDB calls ausente');
expect(js.includes('mobileGps/vehicles/'), 'RTDB vehicles ausente');
expect(js.includes('mobileGps/drivers/'), 'RTDB drivers ausente');
expect(cfg.includes('enabled: true') && cfg.includes('backend: "realtime_database"'), 'fallback de GPS RTDB não restaurado');
expect(css.includes('.driver-field-nav') && css.includes('.driver-active-panel'), 'CSS do modo de campo ausente');
expect(html.includes(version) && js.includes(version), 'versão não unificada no motorista');
console.log('PASS phase1-motorista.test.js');
