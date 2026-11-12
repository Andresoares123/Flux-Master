// ==================== UTILITÁRIOS DE DATA E RELÓGIO REAL ====================
function obterDataHojeReal() {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 12, 0, 0);
}

function obterDataHojeISO() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function formatarDataBR(iso) {
    if (!iso) return '—';
    const partes = String(iso).split('-');
    if (partes.length !== 3) return iso;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarDataCurtaMes(iso) {
    if (!iso) return '—';
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const partes = String(iso).split('-');
    if (partes.length !== 3) return iso;
    const dia = partes[2];
    const mesIdx = parseInt(partes[1], 10) - 1;
    return `${dia} ${meses[mesIdx] || ''}`;
}

function calcularDiasCNH(validadeISO) {
    if (!validadeISO) return 999;
    const val = new Date(validadeISO + 'T12:00:00');
    const hoje = obterDataHojeReal();
    return Math.ceil((val - hoje) / (1000 * 60 * 60 * 24));
}

function atualizarRelogioCabecalho() {
    const agora = new Date();
    const opcoes = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
    const formatada = agora.toLocaleDateString('pt-BR', opcoes);
    const textoFinal = formatada.charAt(0).toUpperCase() + formatada.slice(1);

    const elData = document.getElementById('currentDateText');
    if (elData) elData.textContent = textoFinal;

    const elDataRotas = document.getElementById('rotasDateSub');
    if (elDataRotas) elDataRotas.textContent = textoFinal;

    const hora = agora.getHours();
    const saudacao = hora < 12 ? 'Tenha um ótimo dia' : (hora < 18 ? 'Tenha uma ótima tarde' : 'Tenha uma ótima noite');
    const elSaudacao = document.querySelector('.greeting-box span');
    if (elSaudacao) elSaudacao.textContent = saudacao;
}

// ==================== ESTRUTURA DE REGISTROS E CAPACIDADE ====================
function garantirEstruturaRegistros(v) {
    if (!v.registros) {
        const docsAntigos = v.docs || {};
        v.registros = {
            ipva: {
                vencimento: docsAntigos.crlv || '',
                valor: docsAntigos.crlv ? 'R$ 1.480,00' : '',
                obs: docsAntigos.crlv ? 'Pagamento realizado em cota única.' : ''
            },
            licenciamento: {
                vencimento: docsAntigos.seguro || '',
                valor: docsAntigos.seguro ? 'R$ 167,40' : '',
                obs: docsAntigos.seguro ? 'Licenciamento anual quitado.' : ''
            },
            spvat: {
                vencimento: docsAntigos.tacografo || '',
                valor: docsAntigos.tacografo ? 'R$ 92,00' : '',
                obs: docsAntigos.tacografo ? 'Pagamento realizado via transferência.' : ''
            },
            selo: {
                vencimento: docsAntigos.revisao || '',
                valor: docsAntigos.revisao ? 'R$ 75,00' : '',
                obs: docsAntigos.revisao ? 'Selo anual emitido e fixado no veículo.' : ''
            }
        };
    }
    return v.registros;
}

function analisarRegistrosVeiculo(v) {
    const reg = garantirEstruturaRegistros(v);
    const catalogo = [
        { chave: 'ipva', nome: 'IPVA', desc: 'Imposto sobre a propriedade do veículo' },
        { chave: 'licenciamento', nome: 'Licenciamento', desc: 'Licenciamento anual do veículo' },
        { chave: 'spvat', nome: 'SPVAT', desc: 'Seguro obrigatório do veículo' },
        { chave: 'selo', nome: 'SELO', desc: 'Selo e identificação anual do veículo' }
    ];

    const preenchidos = [];
    catalogo.forEach(item => {
        const dados = reg[item.chave] || { vencimento: '', valor: '', obs: '' };
        if (dados.vencimento) {
            const dias = calcularDiasCNH(dados.vencimento);
            preenchidos.push({
                ...item,
                vencimento: dados.vencimento,
                valor: dados.valor || '',
                obs: dados.obs || '',
                dias
            });
        }
    });

    preenchidos.sort((a, b) => a.vencimento.localeCompare(b.vencimento));

    const vencidos = preenchidos.filter(r => r.dias < 0);
    const proximos = preenchidos.filter(r => r.dias >= 0 && r.dias <= 30);

    return {
        todosPreenchidos: preenchidos,
        maisUrgente: preenchidos.length > 0 ? preenchidos[0] : null,
        temVencido: vencidos.length > 0,
        temProximo: proximos.length > 0,
        vencidos,
        proximos
    };
}

function obterNumeroCapacidade(val) {
    const num = parseInt(String(val || '').replace(/\D/g, ''), 10);
    return isNaN(num) || num <= 0 ? 15 : num;
}

function formatarCapacidadePassageiros(val) {
    return `${obterNumeroCapacidade(val)} passageiros`;
}

// ==================== AUTOMAÇÃO DE CICLO DIÁRIO E INTEGRIDADE ====================
async function verificarStatusRotasAutomatico(apenasAjustarMemoria = false) {
    if (!state || !state.rotas || !state.veiculos) return;

    const agora = new Date();
    const hojeISO = obterDataHojeISO();
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
    let houveMudanca = false;

    // 1. Automação das Manutenções por data
    if (state.manutencoes) {
        state.manutencoes.forEach(m => {
            if (m.status === 'Concluído' || !m.data) return;

            if (m.data > hojeISO && m.status !== 'Agendado') {
                m.status = 'Agendado';
                houveMudanca = true;
            } else if (m.data <= hojeISO && m.status === 'Agendado') {
                m.status = 'Em andamento';
                houveMudanca = true;
            }
        });
    }

    // 2. Ciclo de Rotas (Agendada <-> Em andamento conforme horário do PC)
    state.rotas.forEach(r => {
        if (r.status === 'Finalizada') return;
        if (!r.horaInicio || !r.horaFim) return;

        const veiculoDaRota = state.veiculos.find(v => v.id === Number(r.veiculoId));
        if (veiculoDaRota && veiculoDaRota.status === 'Vendido') {
            const substituto = state.veiculos.find(v => v.status === 'Disponível');
            if (substituto) {
                r.veiculoId = substituto.id;
                houveMudanca = true;
            }
        }

        const [hIni, mIni] = r.horaInicio.split(':').map(Number);
        const [hFim, mFim] = r.horaFim.split(':').map(Number);
        const minInicio = hIni * 60 + mIni;
        const minFim = hFim * 60 + mFim;

        const estaNoHorario = minutosAgora >= minInicio && minutosAgora < minFim;
        const novoStatus = estaNoHorario ? 'Em andamento' : 'Agendada';

        if (r.status !== novoStatus) {
            r.status = novoStatus;
            houveMudanca = true;
        }
    });

    // 3. Sincroniza documentos e status dos veículos
    state.veiculos.forEach(v => {
        garantirEstruturaRegistros(v);

        const capFormatada = formatarCapacidadePassageiros(v.capacidade);
        if (v.capacidade !== capFormatada) {
            v.capacidade = capFormatada;
            houveMudanca = true;
        }

        if (v.status === 'Vendido') return;

        const analiseDoc = analisarRegistrosVeiculo(v);

        // Se tiver documento vencido -> fica Inativo
        if (analiseDoc.temVencido) {
            if (v.status !== 'Inativo') {
                v.status = 'Inativo';
                houveMudanca = true;
            }
            return;
        }

        const temManutencaoEmAndamento = state.manutencoes && state.manutencoes.some(
            m => m.placa === v.placa && m.status === 'Em andamento'
        );
        const temRotaEmAndamento = state.rotas.some(
            r => Number(r.veiculoId) === v.id && r.status === 'Em andamento'
        );

        let statusCorreto = v.status;

        if (temManutencaoEmAndamento) {
            statusCorreto = 'Em manutenção';
        } else if (temRotaEmAndamento) {
            statusCorreto = 'Em rota';
        } else if (
            (!temManutencaoEmAndamento && v.status === 'Em manutenção') ||
            (!temRotaEmAndamento && v.status === 'Em rota') ||
            (!analiseDoc.temVencido && v.status === 'Inativo' && !v.inativadoManualmente)
        ) {
            statusCorreto = 'Disponível';
        }

        if (v.status !== statusCorreto) {
            v.status = statusCorreto;
            houveMudanca = true;
        }
    });

    if (houveMudanca && !apenasAjustarMemoria) {
        await salvarEstado();
        renderizarTudo();
    }
}

// ==================== ESTADO GLOBAL E DADOS PADRÃO ====================
let state = {
    veiculos: [],
    motoristas: [],
    clientes: [],
    rotas: [],
    manutencoes: []
};

const fallbackData = {
    veiculos: [
        { id: 1, placa: 'QWE-4D21', modelo: 'Mercedes Sprinter 417', ano: 2023, capacidade: '15 passageiros', status: 'Inativo', km: { atual: 45200, proxTrocaOleo: 50000 }, docs: { crlv: '2026-10-30', seguro: '2026-11-20', tacografo: '2026-12-15', revisao: '2027-01-10' } },
        { id: 2, placa: 'RTA-8F02', modelo: 'Renault Master L3H2', ano: 2022, capacidade: '16 passageiros', status: 'Inativo', km: { atual: 68900, proxTrocaOleo: 70000 }, docs: { crlv: '2026-11-03', seguro: '2027-02-10', tacografo: '2027-01-20', revisao: '2026-12-01' } },
        { id: 3, placa: 'BXD-7A14', modelo: 'Ford Transit 410', ano: 2021, capacidade: '14 passageiros', status: 'Disponível', km: { atual: 81300, proxTrocaOleo: 90000 }, docs: { crlv: '2026-12-20', seguro: '2027-04-15', tacografo: '2027-03-10', revisao: '2027-02-01' } },
        { id: 4, placa: 'HJK-9C33', modelo: 'Volkswagen Crafter', ano: 2020, capacidade: '16 passageiros', status: 'Disponível', km: { atual: 94000, proxTrocaOleo: 100000 }, docs: { crlv: '', seguro: '', tacografo: '', revisao: '' } },
        { id: 5, placa: 'KLP-3B72', modelo: 'Iveco Daily Minibus', ano: 2023, capacidade: '16 passageiros', status: 'Disponível', km: { atual: 31500, proxTrocaOleo: 40000 }, docs: { crlv: '2027-01-18', seguro: '2027-05-12', tacografo: '2027-04-01', revisao: '2027-03-15' } },
        { id: 6, placa: 'MNO-6E41', modelo: 'Mercedes Sprinter 416', ano: 2024, capacidade: '15 passageiros', status: 'Disponível', km: { atual: 18400, proxTrocaOleo: 25000 }, docs: { crlv: '', seguro: '', tacografo: '', revisao: '' } },
        { id: 7, placa: 'PQR-1A99', modelo: 'Mercedes Sprinter 517', ano: 2024, capacidade: '18 passageiros', status: 'Disponível', km: { atual: 12100, proxTrocaOleo: 20000 }, docs: { crlv: '2027-02-10', seguro: '2027-06-20', tacografo: '2027-05-10', revisao: '2027-04-10' } },
        { id: 8, placa: 'STU-4B22', modelo: 'Renault Master Minibus', ano: 2023, capacidade: '16 passageiros', status: 'Disponível', km: { atual: 39800, proxTrocaOleo: 45000 }, docs: { crlv: '2027-03-05', seguro: '2027-07-01', tacografo: '2027-06-15', revisao: '2027-05-20' } },
        { id: 9, placa: 'VWX-8C55', modelo: 'Fiat Ducato Executiva', ano: 2022, capacidade: '15 passageiros', status: 'Disponível', km: { atual: 55700, proxTrocaOleo: 60000 }, docs: { crlv: '2026-12-12', seguro: '2027-03-18', tacografo: '2027-02-25', revisao: '2027-01-30' } }
    ],
    motoristas: [
        { id: 1, nome: 'Carlos Eduardo Lima', cnh: '04829173650', categoria: 'D', validade: '2027-08-14', telefone: '(11) 98765-4321' },
        { id: 2, nome: 'João Marcos Pereira', cnh: '07391826455', categoria: 'D', validade: '2027-04-22', telefone: '(11) 99123-4567' },
        { id: 3, nome: 'Márcia Vieira Santos', cnh: '05918273641', categoria: 'E', validade: '2026-11-25', telefone: '(11) 97654-3210' },
        { id: 4, nome: 'Roberto Alves Costa', cnh: '08273645190', categoria: 'D', validade: '2026-10-05', telefone: '(11) 96543-2109' },
        { id: 5, nome: 'Paulo Henrique Souza', cnh: '09182736452', categoria: 'D', validade: '2028-01-19', telefone: '(11) 95432-1098' }
    ],
    clientes: [
        { id: 1, empresa: 'Instituto Ideal', iniciais: 'II', contato: 'Ricardo Sales', telefone: '(11) 3456-7890', rotasRealizadas: 18, status: 'Ativo' },
        { id: 2, empresa: 'Construtora Vértice', iniciais: 'CV', contato: 'Beatriz Rocha', telefone: '(21) 99876-1204', rotasRealizadas: 27, status: 'Ativo' },
        { id: 3, empresa: 'BioSaúde', iniciais: 'BS', contato: 'Fernanda Lima', telefone: '(11) 3210-9876', rotasRealizadas: 12, status: 'Inativo' }
    ],
    rotas: [
        { id: 1, clienteId: 1, veiculoId: 5, motoristaId: 1, data: '2026-11-10', periodo: 'Manhã', horaInicio: '10:30', horaFim: '12:30', status: 'Em andamento' },
        { id: 2, clienteId: 2, veiculoId: 3, motoristaId: 2, data: '2026-11-11', periodo: 'Tarde', horaInicio: '13:45', horaFim: '15:30', status: 'Agendada' },
        { id: 3, clienteId: 3, veiculoId: 4, motoristaId: 5, data: '2026-11-11', periodo: 'Noite', horaInicio: '18:00', horaFim: '20:00', status: 'Agendada' }
    ],
    manutencoes: [
        { id: 1, codigo: 1, placa: 'QWE-4D21', data: '2026-10-16', tipo: 'Sistema de freios', oficina: 'Auto Center Norte', obs: 'Troca de pastilhas e discos', custo: 1250, status: 'Concluído' },
        { id: 2, codigo: 2, placa: 'BXD-7A14', data: '2026-10-22', tipo: 'Pneus', oficina: 'Pneus & Cia', obs: 'Alinhamento e 2 pneus novos', custo: 2400, status: 'Concluído' },
        { id: 3, codigo: 3, placa: 'MNO-6E41', data: '2026-11-05', tipo: 'Preventiva', oficina: 'Oficina Diesel Pro', obs: 'Revisão periódica completa', custo: 1300, status: 'Concluído' }
    ]
};

// ==================== INICIALIZAÇÃO SEGURA ====================
document.addEventListener('DOMContentLoaded', async () => {
    if (!localStorage.getItem('lm_token')) {
        window.location.href = '/index.html';
        return;
    }

    const userName = localStorage.getItem('lm_user') || 'Lucas Mendes';
    const userEl = document.getElementById('userNameDisplay');
    if (userEl) userEl.textContent = userName;

    atualizarRelogioCabecalho();
    configurarTemas();
    configurarNavegacao();
    configurarFiltros();

    await carregarDados();
    await verificarStatusRotasAutomatico(true);
    await salvarEstado();
    renderizarTudo();

    setInterval(async () => {
        atualizarRelogioCabecalho();
        await verificarStatusRotasAutomatico(false);
    }, 30000);
});

async function carregarDados() {
    try {
        const res = await fetch('/api/dados');
        const serverData = await res.json();

        if (serverData && serverData.veiculos && serverData.veiculos.length > 0) {
            state = serverData;
            localStorage.setItem('lm_state_v1', JSON.stringify(state));
            return;
        }
    } catch (e) {
        console.warn('Servidor indisponível no momento, buscando cache local...');
    }

    const salvoLocal = localStorage.getItem('lm_state_v1');
    if (salvoLocal) {
        state = JSON.parse(salvoLocal);
    } else {
        state = fallbackData;
        await salvarEstado();
    }
}

async function salvarEstado() {
    localStorage.setItem('lm_state_v1', JSON.stringify(state));
    try {
        await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        });
    } catch (e) {
        console.warn('Salvo localmente no navegador.');
    }
}

function configurarTemas() {
    const sel = document.getElementById('themeSelect');
    if (sel && sel.options.length > 0) {
        const valoresOpcoes = Array.from(sel.options).map(o => o.value);
        let temaSalvo = localStorage.getItem('lm_theme');

        // Se o valor salvo não existir nas opções do HTML, usa a primeira opção ("Claro")
        if (!temaSalvo || !valoresOpcoes.includes(temaSalvo)) {
            temaSalvo = valoresOpcoes[0];
        }

        const aplicarTema = (valor) => {
            const isDark = valor === 'dark' || valor === 'escuro' || valor.toLowerCase().includes('escuro');
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            document.body.setAttribute('data-theme', valor);
            document.body.classList.toggle('dark-mode', isDark);
            document.body.classList.toggle('dark', isDark);
        };

        sel.value = temaSalvo;
        aplicarTema(temaSalvo);

        sel.addEventListener('change', () => {
            aplicarTema(sel.value);
            localStorage.setItem('lm_theme', sel.value);
        });
    }

    const notifBtn = document.getElementById('notifBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    if (notifBtn && notifDropdown) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('open');
        });
        document.addEventListener('click', () => notifDropdown.classList.remove('open'));
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('lm_token');
            window.location.href = '/index.html';
        });
    }
}

function descobrirAbaDoBotao(btn) {
    if (btn.dataset.tab) return btn.dataset.tab.replace(/^tab-/, '');
    if (btn.dataset.target) return btn.dataset.target.replace(/^#?tab-/, '');
    if (btn.dataset.section) return btn.dataset.section.replace(/^tab-/, '');

    const txt = (btn.textContent || '').toLowerCase();
    if (txt.includes('início') || txt.includes('inicio')) return 'inicio';
    if (txt.includes('frota')) return 'frota';
    if (txt.includes('motorista')) return 'motoristas';
    if (txt.includes('cliente')) return 'clientes';
    if (txt.includes('rota')) return 'rotas';
    if (txt.includes('manuten')) return 'manutencoes';
    if (txt.includes('relat')) return 'relatorios';
    return null;
}

function configurarNavegacao() {
    // Captura qualquer botão ou link do menu de navegação superior
    const botoesMenu = document.querySelectorAll(
        '[data-tab], [data-target], [data-section], .nav-btn, .nav-item, .nav-link, .tab-btn, header nav button, header nav a, .top-nav button, .top-nav a'
    );

    botoesMenu.forEach(btn => {
        const aba = descobrirAbaDoBotao(btn);
        if (!aba) return;

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navegarPara(aba);
        });
    });
}

function navegarPara(aba) {
    const abaLimpa = String(aba).replace(/^#?tab-/, '');

    // Atualiza o botão ativo no menu superior
    const botoesMenu = document.querySelectorAll(
        '[data-tab], [data-target], [data-section], .nav-btn, .nav-item, .nav-link, .tab-btn, header nav button, header nav a, .top-nav button, .top-nav a'
    );
    botoesMenu.forEach(b => {
        const abaBotao = descobrirAbaDoBotao(b);
        if (abaBotao) {
            b.classList.toggle('active', abaBotao === abaLimpa);
        }
    });

    // Exibe a seção correspondente à aba clicada e oculta as demais
    const secoes = document.querySelectorAll('.tab-section, .tab-content, section[id^="tab-"]');
    secoes.forEach(sec => {
        const isEstaAba = sec.id === `tab-${abaLimpa}` || sec.id === abaLimpa;
        sec.classList.toggle('active', isEstaAba);
        sec.style.display = isEstaAba ? 'block' : 'none';
    });

    const titulos = {
        'inicio': 'Painel operacional',
        'frota': 'Frota de veículos',
        'motoristas': 'Motoristas',
        'clientes': 'Clientes corporativos',
        'rotas': 'Rotas',
        'manutencoes': 'Manutenções',
        'relatorios': 'Relatórios'
    };
    const titleEl = document.getElementById('pageHeaderTitle');
    if (titleEl && titulos[abaLimpa]) titleEl.textContent = titulos[abaLimpa];

    // Garante que os dados da aba aberta estejam sempre atualizados na tela
    renderizarTudo();
}

function irParaNotificacao(aba) {
    const notifDropdown = document.getElementById('notifDropdown');
    if (notifDropdown) notifDropdown.classList.remove('open');
    navegarPara(aba);
}

function abrirNotificacoesPeloBanner(e) {
    if (e) e.stopPropagation();
    const notifDropdown = document.getElementById('notifDropdown');
    if (notifDropdown) notifDropdown.classList.add('open');
}

// ==================== RENDERIZAÇÃO BLINDADA DE TODAS AS ABAS ====================
function renderizarTudo() {
    const etapas = [
        renderizarNotificacoes,
        renderizarDashboard,
        renderizarFrota,
        renderizarMotoristas,
        renderizarClientes,
        renderizarRotas,
        renderizarManutencoesERelatorios
    ];

    etapas.forEach(fn => {
        try {
            fn();
        } catch (err) {
            console.error(`Erro ao executar ${fn.name}:`, err);
        }
    });
}

// 1. Notificações Automáticas
function renderizarNotificacoes() {
    const notificacoes = [];
    let qtdMotoristas = 0;
    let qtdVeiculos = 0;

    state.motoristas.forEach(m => {
        const st = obterStatusCNH(m.validade);
        if (st.codigo !== 'Regular') {
            qtdMotoristas++;
            notificacoes.push({
                titulo: `CNH ${st.codigo === 'Vencida' ? 'Vencida' : 'Próxima do vencimento'}: ${m.nome}`,
                desc: `${st.texto} (Vencimento: ${formatarDataBR(m.validade)})`,
                aba: 'motoristas'
            });
        }
    });

    state.veiculos.filter(v => v.status !== 'Vendido').forEach(v => {
        const analise = analisarRegistrosVeiculo(v);

        analise.todosPreenchidos.forEach(doc => {
            if (doc.dias < 0) {
                qtdVeiculos++;
                notificacoes.push({
                    titulo: `${doc.nome} Vencido (Veículo Inativado): ${v.placa}`,
                    desc: `Venceu há ${Math.abs(doc.dias)} dias (${formatarDataBR(doc.vencimento)})`,
                    aba: 'frota'
                });
            } else if (doc.dias <= 30) {
                qtdVeiculos++;
                notificacoes.push({
                    titulo: `${doc.nome} próximo do vencimento: ${v.placa}`,
                    desc: `Vence em ${doc.dias === 0 ? 'hoje' : doc.dias + ' dias'} (${formatarDataBR(doc.vencimento)})`,
                    aba: 'frota'
                });
            }
        });

        if (v.km && (v.km.proxTrocaOleo - v.km.atual <= 1500)) {
            qtdVeiculos++;
            const restante = v.km.proxTrocaOleo - v.km.atual;
            notificacoes.push({
                titulo: `Revisão/Óleo por KM: ${v.placa}`,
                desc: restante <= 0 ? `KM excedido em ${Math.abs(restante)} km` : `Faltam apenas ${restante} km para troca`,
                aba: 'frota'
            });
        }
    });

    const badge = document.getElementById('notifCountBadge');
    if (badge) {
        badge.textContent = notificacoes.length;
        badge.style.display = notificacoes.length > 0 ? 'flex' : 'none';
    }

    const alertBanner = document.getElementById('dashAlertBanner');
    const alertText = document.getElementById('dashAlertText');
    if (alertBanner && alertText) {
        if (notificacoes.length > 0) {
            alertBanner.style.display = 'flex';
            alertText.textContent = `${qtdMotoristas} motorista(s) com CNH em alerta/vencida e ${qtdVeiculos} pendência(s) de veículo/documentação.`;
        } else {
            alertBanner.style.display = 'none';
        }
    }

    const listEl = document.getElementById('notifList');
    if (listEl) {
        if (notificacoes.length === 0) {
            listEl.innerHTML = `<div class="notif-item"><p>Nenhuma pendência operacional no momento.</p></div>`;
        } else {
            listEl.innerHTML = notificacoes.map(n => `
                <div class="notif-item" onclick="irParaNotificacao('${n.aba}')">
                    <strong>${n.titulo}</strong>
                    <p>${n.desc}</p>
                </div>
            `).join('');
        }
    }
}

// Auxiliares de Custos para os Gráficos
function calcularCustosUltimosMeses(qtdMeses) {
    const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const hoje = new Date();
    const resultado = [];

    for (let i = qtdMeses - 1; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const ano = d.getFullYear();
        const mesIndex = d.getMonth();
        const chaveAnoMes = `${ano}-${String(mesIndex + 1).padStart(2, '0')}`;

        const somaMes = state.manutencoes.reduce((acc, m) => {
            if (m.data && m.data.startsWith(chaveAnoMes)) {
                return acc + Number(m.custo || 0);
            }
            return acc;
        }, 0);

        resultado.push({
            chave: chaveAnoMes,
            nome: nomesMeses[mesIndex],
            valor: somaMes
        });
    }
    return resultado;
}

function formatarValorCurto(val) {
    if (val >= 1000) {
        return `R$ ${(val / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
    }
    return `R$ ${val.toLocaleString('pt-BR')}`;
}

// 2. Dashboard
function renderizarDashboard() {
    const frotaEmpresa = state.veiculos.filter(v => v.status !== 'Vendido');
    const totalV = frotaEmpresa.length;
    const manutV = frotaEmpresa.filter(v => v.status === 'Em manutenção').length;
    const dispV = totalV - manutV;
    const pct = totalV > 0 ? Math.round((dispV / totalV) * 100) : 0;

    const setEl = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

    setEl('dashVeiculosDisp', `${dispV} de ${totalV}`);
    setEl('dashVeiculosManut', `${manutV} veículos em manutenção`);
    setEl('dashSitFrota', `Situação atual dos ${totalV} veículos`);
    setEl('dashDonutPct', `${pct}%`);
    const ringEl = document.getElementById('dashDonutRing');
    if (ringEl) ringEl.style.background = `conic-gradient(var(--success) 0% ${pct}%, #E2E8F0 ${pct}% 100%)`;
    setEl('dashLegDisp', dispV);
    setEl('dashLegManut', manutV);

    // KPI Rotas Hoje
    const rotasAtivas = state.rotas.filter(r => r.status !== 'Finalizada');
    const qtdAndamento = rotasAtivas.filter(r => r.status === 'Em andamento').length;
    const qtdAgendadas = rotasAtivas.filter(r => r.status === 'Agendada').length;
    const totalHoje = rotasAtivas.length;

    setEl('dashRotasHoje', `${totalHoje} ${totalHoje === 1 ? 'rota' : 'rotas'}`);
    setEl('dashRotasSub', `${qtdAndamento} em andamento · ${qtdAgendadas} agendada${qtdAgendadas !== 1 ? 's' : ''}`);

    // Gráfico de Distribuição das Rotas
    const faixas = [
        { idx: 0, iniPadrao: 6, fimPadrao: 9, minHora: null, maxHora: null, qtd: 0, qtdAndamento: 0 },
        { idx: 1, iniPadrao: 9, fimPadrao: 12, minHora: null, maxHora: null, qtd: 0, qtdAndamento: 0 },
        { idx: 2, iniPadrao: 12, fimPadrao: 15, minHora: null, maxHora: null, qtd: 0, qtdAndamento: 0 },
        { idx: 3, iniPadrao: 15, fimPadrao: 18, minHora: null, maxHora: null, qtd: 0, qtdAndamento: 0 },
        { idx: 4, iniPadrao: 18, fimPadrao: 21, minHora: null, maxHora: null, qtd: 0, qtdAndamento: 0 }
    ];

    rotasAtivas.forEach(r => {
        if (!r.horaInicio) return;
        const hora = parseInt(r.horaInicio.split(':')[0], 10);
        if (isNaN(hora)) return;

        let idx = 0;
        if (hora < 9) idx = 0;
        else if (hora < 12) idx = 1;
        else if (hora < 15) idx = 2;
        else if (hora < 18) idx = 3;
        else idx = 4;

        faixas[idx].qtd++;
        if (r.status === 'Em andamento') faixas[idx].qtdAndamento++;
        if (faixas[idx].minHora === null || hora < faixas[idx].minHora) faixas[idx].minHora = hora;
        if (faixas[idx].maxHora === null || hora > faixas[idx].maxHora) faixas[idx].maxHora = hora;
    });

    const barsContainer = document.getElementById('dashRouteBars');
    const peakEl = document.getElementById('dashRoutePeak');
    setEl('dashRouteActiveCount', `• ${qtdAndamento} em andamento`);

    if (barsContainer) {
        const maiorQtdTotal = Math.max(...faixas.map(f => f.qtd), 1);
        const maiorQtdAndamento = Math.max(...faixas.map(f => f.qtdAndamento), 0);

        faixas.forEach(f => {
            f.iniReal = (f.minHora !== null && f.minHora < f.iniPadrao) ? f.minHora : f.iniPadrao;
            f.fimReal = (f.maxHora !== null && f.maxHora > f.fimPadrao) ? f.maxHora : f.fimPadrao;
            f.iniStr = String(f.iniReal).padStart(2, '0');
            f.fimStr = String(f.fimReal).padStart(2, '0');
            f.labelDinamico = `${f.iniStr}–${f.fimStr}`;
        });

        const criterioPico = maiorQtdAndamento > 0
            ? (f => f.qtdAndamento === maiorQtdAndamento)
            : (f => f.qtd > 0 && f.qtd === maiorQtdTotal);

        const faixasDePico = faixas.filter(criterioPico);

        barsContainer.innerHTML = faixas.map(f => {
            const alturaPx = f.qtd > 0 ? Math.max(Math.round((f.qtd / maiorQtdTotal) * 85), 24) : 6;
            const isPeak = criterioPico(f);
            const estiloZero = f.qtd === 0 ? 'background-color: var(--border); opacity: 0.6;' : '';

            return `
                <div class="bar-col">
                    <span class="bar-val" style="${f.qtd === 0 ? 'color: var(--text-muted); font-weight: 500;' : ''}">${f.qtd}</span>
                    <div class="bar-fill ${isPeak ? 'highlight' : ''}" style="height: ${alturaPx}px; ${estiloZero}"></div>
                    <span class="bar-label">${f.labelDinamico}</span>
                </div>
            `;
        }).join('');

        if (peakEl) {
            if (faixasDePico.length === 0) {
                peakEl.textContent = 'Sem rotas ativas programadas';
            } else if (faixasDePico.length === 1) {
                peakEl.textContent = `Pico entre ${faixasDePico[0].iniStr}h e ${faixasDePico[0].fimStr}h`;
            } else {
                const primeira = faixasDePico[0];
                const ultima = faixasDePico[faixasDePico.length - 1];
                peakEl.textContent = `Pico entre ${primeira.iniStr}h e ${ultima.fimStr}h`;
            }
        }
    }

    // Custos dos últimos 4 meses
    const ultimos4 = calcularCustosUltimosMeses(4);
    const maiorValor = Math.max(...ultimos4.map(m => m.valor), 1);

    const pillarsEl = document.getElementById('dashCostPillars');
    if (pillarsEl) {
        pillarsEl.innerHTML = ultimos4.map((m, idx) => {
            const alturaPct = m.valor > 0 ? Math.max(Math.round((m.valor / maiorValor) * 90), 12) : 6;
            const isUltimo = idx === ultimos4.length - 1;
            return `
                <div class="cost-pillar-item">
                    <strong>${formatarValorCurto(m.valor)}</strong>
                    <div class="cost-pillar-box">
                        <div class="cost-pillar-inner ${isUltimo ? 'active' : ''}" style="height: ${alturaPct}%;"></div>
                    </div>
                    <span>${m.nome}</span>
                </div>
            `;
        }).join('');
    }

    const totalGasto = state.manutencoes.reduce((acc, m) => acc + Number(m.custo || 0), 0);
    const gastoFormatado = `R$ ${totalGasto.toLocaleString('pt-BR')}`;
    setEl('dashGastoMes', gastoFormatado);
    setEl('dashFooterCusto', gastoFormatado);
}

// 3. Frota de Veículos
function renderizarFrota() {
    const frotaAtiva = state.veiculos.filter(v => v.status !== 'Vendido');
    const manut = frotaAtiva.filter(v => v.status === 'Em manutenção').length;
    const disp = frotaAtiva.filter(v => v.status === 'Disponível' || v.status === 'Em rota').length;

    const elTotal = document.getElementById('frotaTotalCount');
    const elDisp = document.getElementById('frotaDispCount');
    const elManut = document.getElementById('frotaManutCount');
    if (elTotal) elTotal.textContent = frotaAtiva.length;
    if (elDisp) elDisp.textContent = disp;
    if (elManut) elManut.textContent = manut;

    const busca = (document.getElementById('searchFrota')?.value || '').toLowerCase();
    const statusFiltro = document.getElementById('filterStatusFrota')?.value || 'Todos';

    const filtrados = state.veiculos.filter(v => {
        const matchTexto = v.placa.toLowerCase().includes(busca) || v.modelo.toLowerCase().includes(busca);
        let matchStatus = false;
        if (statusFiltro === 'Todos') {
            matchStatus = v.status !== 'Vendido';
        } else {
            matchStatus = v.status === statusFiltro;
        }
        return matchTexto && matchStatus;
    });

    const mapBadge = {
        'Disponível': 'green',
        'Em rota': 'blue',
        'Em manutenção': 'orange',
        'Inativo': 'gray',
        'Vendido': 'red'
    };

    const tbody = document.getElementById('tabelaFrotaBody');
    if (!tbody) return;

    tbody.innerHTML = filtrados.map(v => {
        const analise = analisarRegistrosVeiculo(v);
        const docUrgente = analise.maisUrgente;

        let celulaRegistros = `<button class="add-doc-btn" onclick="abrirModalRegistrosVeiculo(${v.id})">+ Adicionar</button>`;

        if (docUrgente) {
            let corTexto = '#1D4ED8';
            let labelTopo = `Próximo vencimento (${docUrgente.nome})`;
            let bgIcone = '#EFF6FF';

            if (docUrgente.dias < 0) {
                corTexto = '#DC2626';
                labelTopo = `${docUrgente.nome} Vencido`;
                bgIcone = '#FEE2E2';
            } else if (docUrgente.dias <= 30) {
                corTexto = '#D97706';
                labelTopo = `Vence em ${docUrgente.dias}d (${docUrgente.nome})`;
                bgIcone = '#FEF3C7';
            }

            celulaRegistros = `
                <div class="doc-Expire" style="cursor:pointer;" onclick="abrirModalRegistrosVeiculo(${v.id})" title="Clique para ver IPVA, Licenciamento, SPVAT e SELO">
                    <div class="doc-Expire-icon" style="background:${bgIcone};">🗓️</div>
                    <div class="doc-Expire-text">
                        <small style="${docUrgente.dias < 0 ? 'color:#DC2626; font-weight:700;' : ''}">${labelTopo}</small>
                        <strong style="color:${corTexto};">${formatarDataBR(docUrgente.vencimento)}</strong>
                    </div>
                </div>
            `;
        }

        return `
            <tr>
                <td><strong>${v.placa}</strong></td>
                <td style="color:var(--text-muted);">${v.modelo}</td>
                <td style="color:var(--text-muted);">${v.ano}</td>
                <td style="color:var(--text-muted);">${formatarCapacidadePassageiros(v.capacidade)}</td>
                <td><span class="badge ${mapBadge[v.status] || 'gray'}">• ${v.status}</span></td>
                <td>${celulaRegistros}</td>
                <td>
                    <button class="action-btn" onclick="abrirModalControleVeiculo(${v.id})">✎ Controle</button>
                </td>
            </tr>
        `;
    }).join('');
}

// 4. Motoristas
function obterStatusCNH(validadeISO) {
    const dias = calcularDiasCNH(validadeISO);
    if (dias < 0) {
        return {
            codigo: 'Vencida',
            classe: 'red',
            texto: `Vencida há ${Math.abs(dias)} dias`,
            bloqueadoRota: true,
            motivo: 'CNH Vencida'
        };
    } else if (dias <= 30) {
        return {
            codigo: 'Alerta',
            classe: 'orange',
            texto: `Vence em ${dias} dias`,
            bloqueadoRota: true,
            motivo: `CNH prestes a vencer (${dias} dias)`
        };
    }
    return {
        codigo: 'Regular',
        classe: 'green',
        texto: 'Regular',
        bloqueadoRota: false,
        motivo: ''
    };
}

function renderizarMotoristas() {
    let qtdAlerta = 0;
    let qtdVencida = 0;

    state.motoristas.forEach(m => {
        const st = obterStatusCNH(m.validade);
        if (st.codigo === 'Alerta') qtdAlerta++;
        if (st.codigo === 'Vencida') qtdVencida++;
    });

    const setEl = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    setEl('motTotalCount', state.motoristas.length);
    setEl('motAlertaCount', qtdAlerta);
    setEl('motVencidaCount', qtdVencida);

    const pill = document.getElementById('motAttentionPill');
    if (pill) {
        const totalAtencao = qtdAlerta + qtdVencida;
        pill.textContent = `• ${totalAtencao} habilitaç${totalAtencao === 1 ? 'ão requer' : 'ões requerem'} atenção`;
        pill.style.display = totalAtencao > 0 ? 'inline-block' : 'none';
    }

    const busca = (document.getElementById('searchMotorista')?.value || '').toLowerCase();
    const filtrados = state.motoristas.filter(m =>
        m.nome.toLowerCase().includes(busca) || m.cnh.includes(busca)
    );

    const tbody = document.getElementById('tabelaMotoristasBody');
    if (!tbody) return;

    tbody.innerHTML = filtrados.map(m => {
        const st = obterStatusCNH(m.validade);
        return `
            <tr>
                <td>
                    <strong>${m.nome}</strong>
                    <small style="display:block; color:var(--text-muted); font-size:11.5px;">${m.telefone}</small>
                </td>
                <td style="color:var(--text-muted);">${m.cnh}</td>
                <td><strong>Categoria ${m.categoria}</strong></td>
                <td style="color:var(--text-muted);">${formatarDataBR(m.validade)}</td>
                <td><span class="badge ${st.classe}">• ${st.texto}</span></td>
                <td>
                    <button class="action-btn" onclick="abrirModalMotorista(${m.id})">Editar</button>
                </td>
            </tr>
        `;
    }).join('');
}

// 5. Clientes Corporativos
function renderizarClientes() {
    const busca = (document.getElementById('searchCliente')?.value || '').toLowerCase();
    const filtroStatus = document.getElementById('filterStatusCliente')?.value || 'Ativo';

    const filtrados = state.clientes.filter(c => {
        const matchTexto =
            c.empresa.toLowerCase().includes(busca) ||
            c.contato.toLowerCase().includes(busca) ||
            c.telefone.includes(busca);

        const matchStatus = filtroStatus === 'Todos' ? true : c.status === filtroStatus;
        return matchTexto && matchStatus;
    });

    const grid = document.getElementById('clientesGrid');
    if (!grid) return;

    if (filtrados.length === 0) {
        grid.innerHTML = `<div class="card" style="grid-column: 1 / -1; text-align:center; color:var(--text-muted); padding: 28px;">Nenhum cliente encontrado para este filtro.</div>`;
        return;
    }

    grid.innerHTML = filtrados.map(c => `
        <div class="card client-card">
            <div>
                <div class="client-card-top">
                    <div class="client-initials">${c.iniciais}</div>
                    <span class="badge ${c.status === 'Ativo' ? 'green' : 'gray'}">• ${c.status}</span>
                </div>
                <h3>${c.empresa}</h3>
                <p class="client-meta"><strong>Nome:</strong> ${c.contato}</p>
                <p class="client-meta"><strong>Contato:</strong> ${c.telefone}</p>
            </div>
            <div class="client-card-footer">
                <span><strong>${c.rotasRealizadas}</strong> rotas realizadas</span>
                <button class="action-btn" onclick="abrirModalCliente(${c.id})">Detalhes ›</button>
            </div>
        </div>
    `).join('');
}

// 6. Rotas
function renderizarRotas() {
    const rotasNaoFinalizadas = state.rotas.filter(r => r.status !== 'Finalizada');
    const andamento = state.rotas.filter(r => r.status === 'Em andamento').length;

    const elTotal = document.getElementById('rotasTotalCount');
    const elAndamento = document.getElementById('rotasAndamentoCount');
    if (elTotal) elTotal.textContent = rotasNaoFinalizadas.length;
    if (elAndamento) elAndamento.textContent = andamento;

    const busca = (document.getElementById('searchRota')?.value || '').toLowerCase();
    const filtroStatus = document.getElementById('filterStatusRota')?.value || 'Ativas';

    const rotasFiltradas = state.rotas.filter(r => {
        const cli = state.clientes.find(c => c.id === Number(r.clienteId)) || { empresa: '' };
        const vei = state.veiculos.find(v => v.id === Number(r.veiculoId)) || { modelo: '', placa: '' };
        const mot = state.motoristas.find(m => m.id === Number(r.motoristaId)) || { nome: '' };

        let matchStatus = true;
        if (filtroStatus === 'Ativas') {
            matchStatus = r.status !== 'Finalizada';
        } else if (filtroStatus !== 'Todos') {
            matchStatus = r.status === filtroStatus;
        }

        const matchBusca =
            cli.empresa.toLowerCase().includes(busca) ||
            vei.placa.toLowerCase().includes(busca) ||
            vei.modelo.toLowerCase().includes(busca) ||
            mot.nome.toLowerCase().includes(busca);

        return matchStatus && matchBusca;
    });

    const container = document.getElementById('listaRotasContainer');
    if (!container) return;

    if (rotasFiltradas.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding: 28px;">Nenhuma rota encontrada para este filtro.</div>`;
        return;
    }

    container.innerHTML = rotasFiltradas.map(r => {
        const cli = state.clientes.find(c => c.id === Number(r.clienteId)) || { empresa: 'Cliente' };
        const vei = state.veiculos.find(v => v.id === Number(r.veiculoId)) || { modelo: 'Veículo', placa: '' };
        const mot = state.motoristas.find(m => m.id === Number(r.motoristaId)) || { nome: 'Motorista' };

        const mapCorStatus = {
            'Em andamento': 'blue',
            'Agendada': 'orange',
            'Finalizada': 'gray'
        };
        const badgeClass = mapCorStatus[r.status] || 'gray';
        const statusLabel = r.status === 'Finalizada' ? 'Finalizado' : (r.status === 'Agendada' ? 'Agendado' : r.status);

        return `
            <div class="route-item">
                <div class="route-left">
                    <h4>
                        ${cli.empresa}
                        <span class="badge ${badgeClass}">• ${statusLabel}</span>
                    </h4>
                    <div class="route-sub">${vei.modelo.split(' ')[1] || vei.modelo} · ${vei.placa}</div>
                    <div class="route-driver">
                        <strong>${mot.nome.split(' ').slice(0,2).join(' ')}</strong>
                        <span style="color:var(--text-muted); margin-left:8px;">Início: <strong style="color:var(--text-main);">${formatarDataBR(r.data)}</strong></span>
                    </div>
                </div>
                <div class="route-right">
                    <div class="time-box">
                        <span style="color:var(--blue-light);">🕒</span>
                        <div>
                            <small>Período ${(r.periodo || 'Manhã').toLowerCase()}</small>
                            <strong>${r.horaInicio}–${r.horaFim}</strong>
                        </div>
                    </div>
                    <button class="icon-btn" onclick="abrirModalRota(${r.id})" title="Editar rota">⋯</button>
                </div>
            </div>
        `;
    }).join('');
}

// 7. Manutenções e Relatórios
// 7. Manutenções e Relatórios
function renderizarManutencoesERelatorios() {
    state.manutencoes.forEach((m, index) => {
        if (!m.codigo) m.codigo = index + 1;
    });

    const frotaEmpresa = state.veiculos.filter(v => v.status !== 'Vendido');
    const totalCusto = state.manutencoes.reduce((acc, m) => acc + Number(m.custo || 0), 0);
    const custoMedio = frotaEmpresa.length > 0 ? Math.round(totalCusto / frotaEmpresa.length) : 0;

    const qtdConcluidos = state.manutencoes.filter(m => m.status === 'Concluído').length;
    const qtdAbertos = state.manutencoes.filter(m => m.status !== 'Concluído').length;
    const totalServicosExibicao = state.manutencoes.length;

    const textoSubServicos = `${qtdConcluidos} concluído${qtdConcluidos !== 1 ? 's' : ''} · ${qtdAbertos} aberto${qtdAbertos !== 1 ? 's' : ''}`;

    const setEl = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

    // Atualiza cards da aba Manutenções
    setEl('manutGastoTotal', `R$ ${totalCusto.toLocaleString('pt-BR')}`);
    setEl('manutCustoMedio', `R$ ${custoMedio.toLocaleString('pt-BR')}`);
    setEl('manutQtdTotal', totalServicosExibicao);
    setEl('manutQtdSub', textoSubServicos);

    // Atualiza cards da aba Relatórios (incluindo o subtítulo de concluídos e abertos)
    setEl('relGastoTotal', `R$ ${totalCusto.toLocaleString('pt-BR')}`);
    setEl('relCustoMedio', `R$ ${custoMedio.toLocaleString('pt-BR')}`);
    setEl('relServicosTotal', totalServicosExibicao);
    setEl('relServicosSub', textoSubServicos);

    const cardRelServicos = document.getElementById('relServicosTotal')?.closest('.card');
    const subRelEl = cardRelServicos?.querySelector('.kpi-sub');
    if (subRelEl) subRelEl.textContent = textoSubServicos;

    const ultimos3 = calcularCustosUltimosMeses(3);
    const max3M = Math.max(...ultimos3.map(m => m.valor), 1);
    const container3M = document.getElementById('relCostPillars3M');
    if (container3M) {
        container3M.innerHTML = ultimos3.map(m => {
            const alturaPct = m.valor > 0 ? Math.max(Math.round((m.valor / max3M) * 90), 12) : 6;
            return `
                <div>
                    <strong style="display:block; font-size:11.5px; margin-bottom:6px;">${formatarValorCurto(m.valor)}</strong>
                    <div style="height: 90px; background: #EFF6FF; border-radius: 8px; display:flex; align-items:flex-end; overflow:hidden;">
                        <div style="width:100%; height: ${alturaPct}%; background: var(--navy); border-radius: 6px; transition: height 0.3s;"></div>
                    </div>
                    <small style="display:block; margin-top:8px; color:var(--text-muted); font-weight:600;">${m.nome}</small>
                </div>
            `;
        }).join('');
    }

    const containerCat = document.getElementById('relCategoriasContainer');
    if (containerCat) {
        const mapaCores = {
            'Pneus': 'var(--blue-light)',
            'Sistema de freios': 'var(--navy)',
            'Preventiva': 'var(--success)',
            'Troca de óleo': 'var(--warning)',
            'Motor / marcha': 'var(--danger)'
        };

        const somaPorCategoria = {};
        state.manutencoes.forEach(m => {
            const cat = m.tipo || 'Outros';
            somaPorCategoria[cat] = (somaPorCategoria[cat] || 0) + Number(m.custo || 0);
        });

        const listaCategorias = Object.entries(somaPorCategoria)
            .map(([nome, valor]) => ({
                nome,
                valor,
                pct: totalCusto > 0 ? Math.round((valor / totalCusto) * 100) : 0,
                cor: mapaCores[nome] || 'var(--blue-light)'
            }))
            .sort((a, b) => b.valor - a.valor);

        if (listaCategorias.length === 0) {
            containerCat.innerHTML = `<p style="color:var(--text-muted); font-size:12px;">Nenhum custo registrado.</p>`;
        } else {
            containerCat.innerHTML = listaCategorias.map(item => `
                <div class="progress-group" style="margin-bottom: 12px;">
                    <div class="progress-label">
                        <span>${item.nome} <small style="color:var(--text-muted); font-weight:400;">(R$ ${item.valor.toLocaleString('pt-BR')})</small></span>
                        <span>${item.pct}%</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-bar" style="width: ${item.pct}%; background: ${item.cor}; transition: width 0.3s;"></div>
                    </div>
                </div>
            `).join('');
        }
    }

    const termoBusca = (document.getElementById('searchManutencao')?.value || '').trim().toLowerCase();
    const filtroStatus = document.getElementById('filterStatusManutencao')?.value || 'Pendentes';

    const manutencoesFiltradas = state.manutencoes.filter(m => {
        let matchStatus = true;
        if (filtroStatus === 'Pendentes') {
            matchStatus = m.status !== 'Concluído';
        } else if (filtroStatus !== 'Todos') {
            matchStatus = m.status === filtroStatus;
        }

        let matchBusca = true;
        if (termoBusca) {
            const codigoStr = String(m.codigo);
            const ehNumeroPuro = /^\d+$/.test(termoBusca);
            if (ehNumeroPuro) {
                matchBusca = codigoStr === termoBusca || m.placa.toLowerCase().includes(termoBusca);
            } else {
                matchBusca =
                    codigoStr.includes(termoBusca) ||
                    m.placa.toLowerCase().includes(termoBusca) ||
                    m.tipo.toLowerCase().includes(termoBusca) ||
                    m.oficina.toLowerCase().includes(termoBusca) ||
                    (m.obs && m.obs.toLowerCase().includes(termoBusca));
            }
        }
        return matchStatus && matchBusca;
    });

    const gerarLinhasHTML = (lista) => {
        if (lista.length === 0) {
            return `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding: 28px;">Nenhum serviço encontrado para este filtro.</td></tr>`;
        }
        return lista.map(m => {
            const badgeClass = m.status === 'Concluído' ? 'green' : (m.status === 'Em andamento' ? 'orange' : 'blue');
            return `
                <tr>
                    <td><strong>${m.placa}</strong></td>
                    <td>
                        <button type="button" class="action-btn" style="color:#1D4ED8; font-weight:700;" onclick="abrirModalManutencao(${m.id})" title="Clique para editar o serviço #${m.codigo}">
                            ${m.codigo}
                        </button>
                    </td>
                    <td style="color:var(--text-muted);">${formatarDataCurtaMes(m.data)}</td>
                    <td><strong>${m.tipo}</strong></td>
                    <td>
                        <strong>${m.oficina}</strong>
                        ${m.obs ? `<small style="display:block; color:var(--text-muted); font-size:11.5px;">${m.obs}</small>` : ''}
                    </td>
                    <td><strong>R$ ${Number(m.custo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></td>
                    <td>
                        <span class="badge ${badgeClass}" style="cursor:pointer;" onclick="abrirModalManutencao(${m.id})" title="Clique para alterar o status">
                            • ${m.status} ▾
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    };

    const tbManut = document.getElementById('tabelaManutencoesBody');
    const tbRel = document.getElementById('tabelaRelatoriosBody');
    if (tbManut) tbManut.innerHTML = gerarLinhasHTML(manutencoesFiltradas);
    if (tbRel) tbRel.innerHTML = gerarLinhasHTML(state.manutencoes);

    let reg = 0, alert = 0, venc = 0;
    state.motoristas.forEach(m => {
        const st = obterStatusCNH(m.validade);
        if (st.codigo === 'Regular') reg++;
        else if (st.codigo === 'Alerta') alert++;
        else venc++;
    });
    setEl('relCnhReg', `• ${reg} motoristas`);
    setEl('relCnhAlert', `• ${alert} motoristas`);
    setEl('relCnhVenc', `• ${venc} motorista${venc !== 1 ? 's' : ''}`);
}

function configurarFiltros() {
    document.getElementById('searchFrota')?.addEventListener('input', renderizarFrota);
    document.getElementById('filterStatusFrota')?.addEventListener('change', renderizarFrota);
    document.getElementById('searchMotorista')?.addEventListener('input', renderizarMotoristas);
    document.getElementById('searchCliente')?.addEventListener('input', renderizarClientes);
    document.getElementById('filterStatusCliente')?.addEventListener('change', renderizarClientes);
    document.getElementById('searchRota')?.addEventListener('input', renderizarRotas);
    document.getElementById('filterStatusRota')?.addEventListener('change', renderizarRotas);
    document.getElementById('searchManutencao')?.addEventListener('input', renderizarManutencoesERelatorios);
    document.getElementById('filterStatusManutencao')?.addEventListener('change', renderizarManutencoesERelatorios);
}

// ==================== MODAIS E CADASTROS ====================
function abrirModal(titulo, conteudoHTML) {
    document.getElementById('modalTitle').textContent = titulo;
    document.getElementById('modalBody').innerHTML = conteudoHTML;
    document.getElementById('modalOverlay').classList.add('open');
}

function fecharModal() {
    document.getElementById('modalOverlay').classList.remove('open');
}

// 1. Modal de Cadastro de Novo Veículo
function abrirModalNovoVeiculo() {
    abrirModal('Adicionar Novo Veículo à Frota', `
        <form id="formNovoVeiculo">
            <div class="grid-2">
                <div class="form-group">
                    <label>Placa do Veículo</label>
                    <input type="text" id="nvPlaca" placeholder="Ex: ABC-1D23" required>
                </div>
                <div class="form-group">
                    <label>Ano de Fabricação</label>
                    <input type="number" id="nvAno" value="2025" required>
                </div>
            </div>
            <div class="form-group">
                <label>Marca / Modelo</label>
                <input type="text" id="nvModelo" placeholder="Ex: Mercedes Sprinter 417" required>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Capacidade (Apenas números)</label>
                    <input type="number" id="nvCapacidade" value="16" min="1" required>
                </div>
                <div class="form-group">
                    <label>Status Inicial</label>
                    <select id="nvStatus">
                        <option value="Disponível">Disponível</option>
                        <option value="Em manutenção">Em manutenção</option>
                        <option value="Inativo">Inativo</option>
                    </select>
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>KM Inicial</label>
                    <input type="number" id="nvKmAtual" value="0" required>
                </div>
                <div class="form-group">
                    <label>Vencimento Inicial (IPVA / Licenciamento)</label>
                    <input type="date" id="nvCrlv" value="2027-05-15">
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="fecharModal()">Cancelar</button>
                <button type="submit" class="btn-primary">Cadastrar Veículo</button>
            </div>
        </form>
    `);

    document.getElementById('formNovoVeiculo').addEventListener('submit', async (e) => {
        e.preventDefault();
        const kmInicial = Number(document.getElementById('nvKmAtual').value);
        const dataInicial = document.getElementById('nvCrlv').value;
        const numCap = obterNumeroCapacidade(document.getElementById('nvCapacidade').value);

        state.veiculos.push({
            id: Date.now(),
            placa: document.getElementById('nvPlaca').value.toUpperCase().trim(),
            modelo: document.getElementById('nvModelo').value.trim(),
            ano: Number(document.getElementById('nvAno').value),
            capacidade: `${numCap} passageiros`,
            status: document.getElementById('nvStatus').value,
            km: {
                atual: kmInicial,
                proxTrocaOleo: kmInicial + 10000,
                ultimaAtualizacao: obterDataHojeISO()
            },
            registros: {
                ipva: { vencimento: dataInicial, valor: '', obs: '' },
                licenciamento: { vencimento: '', valor: '', obs: '' },
                spvat: { vencimento: '', valor: '', obs: '' },
                selo: { vencimento: '', valor: '', obs: '' }
            }
        });

        await verificarStatusRotasAutomatico(true);
        await salvarEstado();
        fecharModal();
        renderizarTudo();
    });
}

// 2. Modal "Detalhes de registros" (IPVA, Licenciamento, SPVAT e SELO)
function abrirModalRegistrosVeiculo(id) {
    const v = state.veiculos.find(item => item.id === id);
    if (!v) return;

    const reg = garantirEstruturaRegistros(v);

    const montarBadgeStatusDoc = (dataISO) => {
        if (!dataISO) return `<span class="badge gray" style="font-size:10.5px;">Opcional</span>`;
        const dias = calcularDiasCNH(dataISO);
        if (dias < 0) {
            return `<span class="badge red" style="font-size:10.5px;">• Vencido há ${Math.abs(dias)}d (Inativa veículo)</span>`;
        }
        if (dias <= 30) {
            return `<span class="badge orange" style="font-size:10.5px;">• Vence em ${dias === 0 ? 'hoje' : dias + ' dias'}</span>`;
        }
        return `<span class="badge green" style="font-size:10.5px;">• Em dia (${dias}d restantes)</span>`;
    };

    const blocos = [
        { chave: 'ipva', titulo: 'IPVA', sub: 'Imposto sobre a propriedade do veículo', dados: reg.ipva },
        { chave: 'licenciamento', titulo: 'Licenciamento', sub: 'Licenciamento anual do veículo', dados: reg.licenciamento },
        { chave: 'spvat', titulo: 'SPVAT', sub: 'Seguro obrigatório do veículo', dados: reg.spvat },
        { chave: 'selo', titulo: 'SELO', sub: 'Selo e identificação anual do veículo', dados: reg.selo }
    ];

    abrirModal(`Detalhes de registros`, `
        <p style="font-size: 12.5px; color: var(--text-muted); margin-top: -10px; margin-bottom: 14px;">
            ${v.modelo} · <strong>${v.placa}</strong>
        </p>

        <div style="display:flex; align-items:center; gap:12px; background:#EFF6FF; border:1px solid #BFDBFE; padding:12px 14px; border-radius:10px; margin-bottom:16px;">
            <div style="width:34px; height:34px; border-radius:8px; background:#FFFFFF; display:flex; align-items:center; justify-content:center; font-size:16px;">🗓️</div>
            <div>
                <small style="display:block; font-size:11px; color:#3B82F6;">Documentos opcionais do veículo</small>
                <strong style="font-size:13px; color:#1E3A8A;">Registros e vencimentos</strong>
            </div>
        </div>

        <form id="formRegistrosVeiculo">
            <div style="display:flex; flex-direction:column; gap:14px; max-height: 55vh; overflow-y: auto; padding-right: 4px;">
                ${blocos.map(b => `
                    <div style="border: 1px solid var(--border); border-radius: 12px; padding: 14px; background: var(--bg-card);">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 10px;">
                            <div>
                                <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 2px;">${b.titulo}</h4>
                                <small style="font-size: 11.5px; color: var(--text-muted);">${b.sub}</small>
                            </div>
                            <div id="badge_${b.chave}">${montarBadgeStatusDoc(b.dados.vencimento)}</div>
                        </div>

                        <div class="grid-2" style="margin-bottom: 8px;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="text-transform:none; font-size:11.5px;">Data de vencimento</label>
                                <input type="date" id="reg_${b.chave}_data" value="${b.dados.vencimento || ''}">
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="text-transform:none; font-size:11.5px;">Valor pago</label>
                                <input type="text" id="reg_${b.chave}_valor" value="${b.dados.valor || ''}" placeholder="Ex: R$ 1.480,00">
                            </div>
                        </div>

                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="text-transform:none; font-size:11.5px;">Observação</label>
                            <input type="text" id="reg_${b.chave}_obs" value="${b.dados.obs || ''}" placeholder="Ex: Pagamento realizado em cota única.">
                        </div>
                    </div>
                `).join('')}
            </div>

            <p style="font-size: 11px; color: var(--text-muted); margin-top: 12px; margin-bottom: 8px;">
                Os registros são opcionais. O vencimento mais próximo ficará visível na tabela da frota e documentos vencidos tornam o veículo Inativo automaticamente.
            </p>

            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="fecharModal()">Cancelar</button>
                <button type="submit" class="btn-primary">Salvar registros</button>
            </div>
        </form>
    `);

    blocos.forEach(b => {
        const inputData = document.getElementById(`reg_${b.chave}_data`);
        const badgeContainer = document.getElementById(`badge_${b.chave}`);
        inputData.addEventListener('change', () => {
            badgeContainer.innerHTML = montarBadgeStatusDoc(inputData.value);
        });
    });

    document.getElementById('formRegistrosVeiculo').addEventListener('submit', async (e) => {
        e.preventDefault();

        blocos.forEach(b => {
            v.registros[b.chave] = {
                vencimento: document.getElementById(`reg_${b.chave}_data`).value,
                valor: document.getElementById(`reg_${b.chave}_valor`).value.trim(),
                obs: document.getElementById(`reg_${b.chave}_obs`).value.trim()
            };
        });

        const analiseNova = analisarRegistrosVeiculo(v);
        if (!analiseNova.temVencido && v.status === 'Inativo') {
            v.inativadoManualmente = false;
            v.status = 'Disponível';
        }

        await verificarStatusRotasAutomatico(true);
        await salvarEstado();
        fecharModal();
        renderizarTudo();
    });
}

// 3. Modal de Controle do Veículo
function abrirModalControleVeiculo(id) {
    const v = state.veiculos.find(item => item.id === id);
    if (!v) return;

    const km = v.km || { atual: 10000, proxTrocaOleo: 20000, ultimaAtualizacao: obterDataHojeISO() };
    const capNumero = obterNumeroCapacidade(v.capacidade);

    const rotaVinculada = state.rotas.find(r => Number(r.veiculoId) === v.id && r.status !== 'Finalizada');
    const clienteRota = rotaVinculada ? state.clientes.find(c => c.id === Number(rotaVinculada.clienteId)) : null;

    abrirModal(`Controle Operacional — ${v.placa}`, `
        <form id="formControleVeiculo">
            <div style="background: var(--bg-body); padding: 12px 14px; border-radius: 10px; margin-bottom: 14px; border: 1px solid var(--border);">
                <label style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">1. Dados Cadastrais e Status</label>
                <div class="grid-2" style="margin-top: 8px; margin-bottom: 0;">
                    <div class="form-group" style="margin-bottom:8px;">
                        <label>Modelo</label>
                        <input type="text" id="ctrlModelo" value="${v.modelo}" required>
                    </div>
                    <div class="form-group" style="margin-bottom:8px;">
                        <label>Status na Frota</label>
                        <select id="ctrlStatus">
                            <option value="Disponível" ${v.status === 'Disponível' ? 'selected' : ''}>Disponível</option>
                            <option value="Em rota" ${v.status === 'Em rota' ? 'selected' : ''}>Em rota</option>
                            <option value="Em manutenção" ${v.status === 'Em manutenção' ? 'selected' : ''}>Em manutenção</option>
                            <option value="Inativo" ${v.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
                            <option value="Vendido" ${v.status === 'Vendido' ? 'selected' : ''}>Vendido (Fora da frota)</option>
                        </select>
                    </div>
                </div>
                <div class="grid-2" style="margin-bottom: 0;">
                    <div class="form-group" style="margin-bottom:0;">
                        <label>Ano</label>
                        <input type="number" id="ctrlAno" value="${v.ano}" required>
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label>Capacidade (Passageiros)</label>
                        <input type="number" id="ctrlCap" value="${capNumero}" min="1" required>
                    </div>
                </div>
            </div>

            <div style="background: var(--bg-body); padding: 12px 14px; border-radius: 10px; margin-bottom: 14px; border: 1px solid var(--border);">
                <label style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">2. Controle de Quilometragem (KM)</label>
                <div class="grid-2" style="margin-top: 8px; margin-bottom: 0;">
                    <div class="form-group" style="margin-bottom:0;">
                        <label>KM Atual no Odômetro</label>
                        <input type="number" id="ctrlKmAtual" value="${km.atual}" required>
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label>KM Próxima Troca de Óleo</label>
                        <input type="number" id="ctrlKmOleo" value="${km.proxTrocaOleo}" required>
                    </div>
                </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; background:#EFF6FF; padding:10px 14px; border-radius:10px; margin-bottom:12px; border:1px solid #BFDBFE;">
                <span style="font-size:12px; color:#1E3A8A; font-weight:600;">Deseja editar IPVA, Licenciamento, SPVAT ou SELO?</span>
                <button type="button" class="action-btn" style="color:#1D4ED8; font-weight:700;" onclick="abrirModalRegistrosVeiculo(${v.id})">Abrir Registros ›</button>
            </div>

            <p class="error-msg" id="veiculoBlockError" style="display:none;"></p>

            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="fecharModal()">Cancelar</button>
                <button type="submit" class="btn-primary">Salvar alterações</button>
            </div>
        </form>
    `);

    document.getElementById('formControleVeiculo').addEventListener('submit', async (e) => {
        e.preventDefault();
        const novoStatus = document.getElementById('ctrlStatus').value;
        const errEl = document.getElementById('veiculoBlockError');
        errEl.style.display = 'none';

        const analiseDoc = analisarRegistrosVeiculo(v);

        if (analiseDoc.temVencido && novoStatus !== 'Inativo' && novoStatus !== 'Vendido') {
            const nomesVencidos = analiseDoc.vencidos.map(d => `${d.nome} (${formatarDataBR(d.vencimento)})`).join(', ');
            errEl.textContent = `Veículo bloqueado: Há documento(s) vencido(s) [${nomesVencidos}]. Clique em "Abrir Registros" acima e atualize a data de vencimento para reativar o veículo.`;
            errEl.style.display = 'block';
            return;
        }

        if (rotaVinculada && ['Inativo', 'Vendido', 'Em manutenção'].includes(novoStatus)) {
            const nomeCli = clienteRota ? clienteRota.empresa : 'Cliente';
            errEl.textContent = `Ação bloqueada: Este veículo está vinculado à rota ativa (${rotaVinculada.status}) de "${nomeCli}". Altere o veículo da rota ou finalize-a antes.`;
            errEl.style.display = 'block';
            return;
        }

        const numCap = obterNumeroCapacidade(document.getElementById('ctrlCap').value);

        v.modelo = document.getElementById('ctrlModelo').value.trim();
        v.status = novoStatus;
        v.inativadoManualmente = (novoStatus === 'Inativo');
        v.ano = Number(document.getElementById('ctrlAno').value);
        v.capacidade = `${numCap} passageiros`;

        v.km = {
            atual: Number(document.getElementById('ctrlKmAtual').value),
            proxTrocaOleo: Number(document.getElementById('ctrlKmOleo').value),
            ultimaAtualizacao: obterDataHojeISO()
        };

        await verificarStatusRotasAutomatico(true);
        await salvarEstado();
        fecharModal();
        renderizarTudo();
    });
}

// 4. Modal: Motorista
function abrirModalMotorista(id = null) {
    const m = state.motoristas.find(item => item.id === id) || {
        nome: '', telefone: '', cnh: '', categoria: 'D', validade: '2028-05-10'
    };

    abrirModal(id ? 'Editar Motorista' : 'Cadastrar Motorista', `
        <form id="formMotorista">
            <div class="form-group">
                <label>Nome Completo</label>
                <input type="text" id="mNome" value="${m.nome}" required>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Telefone</label>
                    <input type="text" id="mTel" value="${m.telefone}" placeholder="(11) 99999-0000" required>
                </div>
                <div class="form-group">
                    <label>Categoria CNH</label>
                    <select id="mCat">
                        <option value="D" ${m.categoria === 'D' ? 'selected' : ''}>Categoria D</option>
                        <option value="E" ${m.categoria === 'E' ? 'selected' : ''}>Categoria E</option>
                    </select>
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Registro CNH</label>
                    <input type="text" id="mCnh" value="${m.cnh}" required>
                </div>
                <div class="form-group">
                    <label>Validade da CNH</label>
                    <input type="date" id="mValidade" value="${m.validade}" required>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="fecharModal()">Cancelar</button>
                <button type="submit" class="btn-primary">Salvar motorista</button>
            </div>
        </form>
    `);

    document.getElementById('formMotorista').addEventListener('submit', async (e) => {
        e.preventDefault();
        const dados = {
            nome: document.getElementById('mNome').value,
            telefone: document.getElementById('mTel').value,
            categoria: document.getElementById('mCat').value,
            cnh: document.getElementById('mCnh').value,
            validade: document.getElementById('mValidade').value
        };

        if (id) Object.assign(m, dados);
        else state.motoristas.push({ id: Date.now(), ...dados });

        await salvarEstado();
        fecharModal();
        renderizarTudo();
    });
}

// 5. Modal: Cliente Corporativo
function abrirModalCliente(id = null) {
    const c = state.clientes.find(item => item.id === id) || {
        empresa: '', contato: '', telefone: '', rotasRealizadas: 0, status: 'Ativo'
    };

    const rotaAtivaDoCliente = id ? state.rotas.find(r => Number(r.clienteId) === id && r.status !== 'Finalizada') : null;

    abrirModal(id ? 'Detalhes do Cliente' : 'Novo Cliente Corporativo', `
        <form id="formCliente">
            <div class="form-group">
                <label>Razão Social / Empresa</label>
                <input type="text" id="cEmpresa" value="${c.empresa}" required>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Nome do Responsável</label>
                    <input type="text" id="cContato" value="${c.contato}" required>
                </div>
                <div class="form-group">
                    <label>Telefone</label>
                    <input type="text" id="cTel" value="${c.telefone}" required>
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Rotas Realizadas</label>
                    <input type="number" id="cRotas" value="${c.rotasRealizadas}" required>
                </div>
                <div class="form-group">
                    <label>Status do Contrato</label>
                    <select id="cStatus">
                        <option value="Ativo" ${c.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                        <option value="Inativo" ${c.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
                    </select>
                </div>
            </div>
            <p class="error-msg" id="clienteBlockError" style="display:none;"></p>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="fecharModal()">Cancelar</button>
                <button type="submit" class="btn-primary">Salvar cliente</button>
            </div>
        </form>
    `);

    document.getElementById('formCliente').addEventListener('submit', async (e) => {
        e.preventDefault();
        const novoStatus = document.getElementById('cStatus').value;
        const errEl = document.getElementById('clienteBlockError');
        errEl.style.display = 'none';

        if (rotaAtivaDoCliente && novoStatus === 'Inativo') {
            errEl.textContent = `Ação bloqueada: Este cliente possui uma rota ativa (${rotaAtivaDoCliente.status}). Finalize a rota na aba Rotas antes de inativar o contrato do cliente.`;
            errEl.style.display = 'block';
            return;
        }

        const empresa = document.getElementById('cEmpresa').value;
        const palavras = empresa.trim().split(' ');
        const iniciais = palavras.length > 1 ? (palavras[0][0] + palavras[1][0]).toUpperCase() : empresa.slice(0, 2).toUpperCase();

        const dados = {
            empresa,
            iniciais,
            contato: document.getElementById('cContato').value,
            telefone: document.getElementById('cTel').value,
            rotasRealizadas: Number(document.getElementById('cRotas').value),
            status: novoStatus
        };

        if (id) Object.assign(c, dados);
        else state.clientes.push({ id: Date.now(), ...dados });

        await salvarEstado();
        fecharModal();
        renderizarTudo();
    });
}

// 6. Modal: Rotas
function abrirModalRota(id = null) {
    const clientePadrao = state.clientes.find(c => c.status === 'Ativo') || state.clientes[0];

    const r = state.rotas.find(item => item.id === id) || {
        clienteId: clientePadrao ? clientePadrao.id : 1,
        veiculoId: '',
        motoristaId: '',
        data: obterDataHojeISO(),
        periodo: 'Manhã',
        horaInicio: '08:00',
        horaFim: '10:00',
        status: 'Agendada'
    };

    const veiculosOcupadosEmOutrasRotas = state.rotas
        .filter(rota => rota.id !== id && rota.status !== 'Finalizada')
        .map(rota => Number(rota.veiculoId));

    const veiculosElegiveis = state.veiculos.filter(v => {
        if (v.status === 'Vendido' || v.status === 'Inativo' || v.status === 'Em manutenção') return false;
        const ehOVeiculoDestaRota = id && Number(v.id) === Number(r.veiculoId);
        const estaLivre = !veiculosOcupadosEmOutrasRotas.includes(v.id);
        return ehOVeiculoDestaRota || (v.status === 'Disponível' && estaLivre);
    });

    abrirModal(id ? 'Editar Rota' : 'Nova Rota Operacional', `
        <form id="formRota">
            <div class="form-group">
                <label>Cliente Corporativo</label>
                <select id="rCliente" required>
                    ${state.clientes
                        .filter(c => c.status === 'Ativo' || Number(r.clienteId) === c.id)
                        .map(c => `<option value="${c.id}" ${Number(r.clienteId) === c.id ? 'selected' : ''}>${c.empresa} (${c.status})</option>`)
                        .join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Veículo da Frota (Disponíveis e sem conflito)</label>
                <select id="rVeiculo" required>
                    <option value="">Selecione um veículo disponível na frota...</option>
                    ${veiculosElegiveis.map(v => `<option value="${v.id}" ${Number(r.veiculoId) === v.id ? 'selected' : ''}>${v.placa} - ${v.modelo}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Motorista</label>
                <select id="rMotorista" required>
                    <option value="">Selecione o motorista...</option>
                    ${state.motoristas.map(m => {
                        const st = obterStatusCNH(m.validade);
                        const aviso = st.bloqueadoRota ? ` [BLOQUEADO: ${st.motivo}]` : '';
                        return `<option value="${m.id}" ${Number(r.motoristaId) === m.id ? 'selected' : ''}>${m.nome} (CNH ${m.categoria})${aviso}</option>`;
                    }).join('')}
                </select>
            </div>
            <div class="grid-3" style="gap:10px;">
                <div class="form-group">
                    <label>Data Início</label>
                    <input type="date" id="rData" value="${r.data}" required>
                </div>
                <div class="form-group">
                    <label>Período</label>
                    <select id="rPeriodo">
                        <option value="Manhã" ${r.periodo === 'Manhã' ? 'selected' : ''}>Manhã</option>
                        <option value="Tarde" ${r.periodo === 'Tarde' ? 'selected' : ''}>Tarde</option>
                        <option value="Noite" ${r.periodo === 'Noite' ? 'selected' : ''}>Noite</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Status do Contrato</label>
                    <select id="rStatus">
                        <option value="Agendada" ${r.status === 'Agendada' ? 'selected' : ''}>Ativa (Ciclo automático)</option>
                        <option value="Em andamento" ${r.status === 'Em andamento' ? 'selected' : ''}>Em andamento</option>
                        <option value="Finalizada" ${r.status === 'Finalizada' ? 'selected' : ''}>Finalizada (Encerrar rota)</option>
                    </select>
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Horário Inicial</label>
                    <input type="time" id="rInicio" value="${r.horaInicio}" required>
                </div>
                <div class="form-group">
                    <label>Horário Final</label>
                    <input type="time" id="rFim" value="${r.horaFim}" required>
                </div>
            </div>
            <p class="error-msg" id="rotaBlockError" style="display:none;"></p>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="fecharModal()">Cancelar</button>
                <button type="submit" class="btn-primary">Salvar rota</button>
            </div>
        </form>
    `);

    document.getElementById('formRota').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl = document.getElementById('rotaBlockError');
        errEl.style.display = 'none';

        const motoristaId = Number(document.getElementById('rMotorista').value);
        const veiculoId = Number(document.getElementById('rVeiculo').value);
        const mot = state.motoristas.find(m => m.id === motoristaId);

        if (!veiculoId) {
            errEl.textContent = 'Selecione um veículo disponível da sua frota atual.';
            errEl.style.display = 'block';
            return;
        }

        const statusCNH = obterStatusCNH(mot.validade);
        if (statusCNH.bloqueadoRota) {
            errEl.textContent = `Associação bloqueada: O motorista ${mot.nome} está com a ${statusCNH.motivo}.`;
            errEl.style.display = 'block';
            return;
        }

        const horaInicio = document.getElementById('rInicio').value;
        const horaFim = document.getElementById('rFim').value;
        if (horaFim <= horaInicio) {
            errEl.textContent = 'O horário final deve ser maior que o horário inicial.';
            errEl.style.display = 'block';
            return;
        }

        const conflitoMotorista = state.rotas.find(outra => {
            if (outra.id === id || outra.status === 'Finalizada') return false;
            if (Number(outra.motoristaId) !== motoristaId) return false;
            return (horaInicio < outra.horaFim && horaFim > outra.horaInicio);
        });

        if (conflitoMotorista) {
            errEl.textContent = `Conflito de horário: O motorista ${mot.nome} já está alocado em outra rota entre ${conflitoMotorista.horaInicio} e ${conflitoMotorista.horaFim}.`;
            errEl.style.display = 'block';
            return;
        }

        const dados = {
            clienteId: Number(document.getElementById('rCliente').value),
            veiculoId,
            motoristaId,
            data: document.getElementById('rData').value,
            periodo: document.getElementById('rPeriodo').value,
            horaInicio,
            horaFim,
            status: document.getElementById('rStatus').value
        };

        if (id) Object.assign(r, dados);
        else state.rotas.unshift({ id: Date.now(), ...dados });

        await verificarStatusRotasAutomatico(true);
        await salvarEstado();
        fecharModal();
        renderizarTudo();
    });
}

// 7. Modal: Manutenção
function abrirModalManutencao(id = null) {
    const editando = id !== null;
    const hojeISO = obterDataHojeISO();

    const m = state.manutencoes.find(item => item.id === id) || {
        placa: state.veiculos.find(v => v.status !== 'Vendido')?.placa || state.veiculos[0].placa,
        data: hojeISO,
        tipo: 'Preventiva',
        oficina: '',
        custo: '',
        obs: '',
        status: 'Em andamento'
    };

    const veiculosFrotaAtual = state.veiculos.filter(v => v.status !== 'Vendido' || v.placa === m.placa);

    abrirModal(editando ? `Editar Serviço #${m.codigo || ''} (${m.placa})` : 'Registrar Serviço de Manutenção', `
        <form id="formManutencao">
            <div class="grid-2">
                <div class="form-group">
                    <label>Veículo</label>
                    <select id="manPlaca" required>
                        ${veiculosFrotaAtual.map(v => `<option value="${v.placa}" ${v.placa === m.placa ? 'selected' : ''}>${v.placa} - ${v.modelo}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Data do Serviço</label>
                    <input type="date" id="manData" value="${m.data}" required>
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Tipo de Serviço</label>
                    <select id="manTipo">
                        <option value="Troca de óleo" ${m.tipo === 'Troca de óleo' ? 'selected' : ''}>Troca de óleo</option>
                        <option value="Sistema de freios" ${m.tipo === 'Sistema de freios' ? 'selected' : ''}>Sistema de freios</option>
                        <option value="Pneus" ${m.tipo === 'Pneus' ? 'selected' : ''}>Pneus</option>
                        <option value="Preventiva" ${m.tipo === 'Preventiva' ? 'selected' : ''}>Preventiva</option>
                        <option value="Motor / marcha" ${m.tipo === 'Motor / marcha' ? 'selected' : ''}>Motor / marcha</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Status da Manutenção</label>
                    <select id="manStatus">
                        <option value="Agendado" ${m.status === 'Agendado' ? 'selected' : ''}>Agendado</option>
                        <option value="Em andamento" ${m.status === 'Em andamento' ? 'selected' : ''}>Em andamento</option>
                        <option value="Concluído" ${m.status === 'Concluído' ? 'selected' : ''}>Concluído</option>
                    </select>
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>Oficina</label>
                    <input type="text" id="manOficina" value="${m.oficina}" placeholder="Ex: Auto Center Norte" required>
                </div>
                <div class="form-group">
                    <label>Custo (R$)</label>
                    <input type="number" step="0.01" id="manCusto" value="${m.custo}" placeholder="0.00" required>
                </div>
            </div>
            <div class="form-group">
                <label>Observação</label>
                <input type="text" id="manObs" value="${m.obs || ''}" placeholder="Detalhes do serviço realizado...">
            </div>
            <p class="error-msg" id="manutBlockError" style="display:none;"></p>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="fecharModal()">Cancelar</button>
                <button type="submit" class="btn-primary">${editando ? 'Salvar alterações' : 'Registrar serviço'}</button>
            </div>
        </form>
    `);

    const inputData = document.getElementById('manData');
    const selectStatus = document.getElementById('manStatus');

    inputData.addEventListener('change', () => {
        const dataEscolhida = inputData.value;
        if (!dataEscolhida) return;

        if (dataEscolhida > hojeISO) {
            selectStatus.value = 'Agendado';
        } else if (dataEscolhida <= hojeISO && selectStatus.value === 'Agendado') {
            selectStatus.value = 'Em andamento';
        }
    });

    document.getElementById('formManutencao').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl = document.getElementById('manutBlockError');
        errEl.style.display = 'none';

        const placa = document.getElementById('manPlaca').value;
        const dataEscolhida = inputData.value;
        let status = selectStatus.value;

        if (dataEscolhida > hojeISO && status !== 'Concluído') {
            status = 'Agendado';
        } else if (dataEscolhida <= hojeISO && status === 'Agendado') {
            status = 'Em andamento';
        }

        const veiculo = state.veiculos.find(v => v.placa === placa);

        if (status === 'Em andamento' && veiculo) {
            const rotaRodandoAgora = state.rotas.find(r => Number(r.veiculoId) === veiculo.id && r.status === 'Em andamento');
            if (rotaRodandoAgora) {
                const cli = state.clientes.find(c => c.id === Number(rotaRodandoAgora.clienteId));
                errEl.textContent = `Conflito operacional: O veículo ${placa} está realizando uma viagem "Em andamento" agora (${cli ? cli.empresa : 'Rota ativa'}). Aguarde o fim da viagem ou troque o veículo da rota antes de iniciar a manutenção.`;
                errEl.style.display = 'block';
                return;
            }
        }

        const dados = {
            placa,
            data: dataEscolhida,
            tipo: document.getElementById('manTipo').value,
            oficina: document.getElementById('manOficina').value.trim(),
            custo: Number(document.getElementById('manCusto').value),
            obs: document.getElementById('manObs').value.trim(),
            status
        };

        if (editando) {
            Object.assign(m, dados);
        } else {
            const maiorCodigo = state.manutencoes.reduce((max, item) => Math.max(max, item.codigo || 0), 0);
            state.manutencoes.unshift({
                id: Date.now(),
                codigo: maiorCodigo + 1,
                ...dados
            });
        }

        await verificarStatusRotasAutomatico(true);
        await salvarEstado();
        fecharModal();
        renderizarTudo();
    });
}