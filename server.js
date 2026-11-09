const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Dados iniciais fiéis ao Figma
const initialData = {
    usuarios: [{ id: 1, nome: 'Lucas Mendes', usuario: 'LUCAS MENDES', cargo: 'Proprietário', senha: '123' }],
    veiculos: [
        {
            id: 1, placa: 'QWE-4D21', modelo: 'Mercedes Sprinter 417', ano: 2023, capacidade: '15 passageiros', status: 'Disponível',
            documentos: {
                ipva: { vencimento: '2026-10-15', valor: 3200, obs: 'Cota única' },
                licenciamento: { vencimento: '2026-11-30', valor: 160, obs: '' },
                spvat: { vencimento: '2026-10-15', valor: 120, obs: '' },
                selo: { vencimento: '2026-12-10', valor: 250, obs: 'Vistoria anual' }
            },
            km: { atual: 45200, dataConferencia: '2026-10-01', proxTrocaOleo: 50000, obs: 'Óleo sintético 5W30' }
        },
        {
            id: 2, placa: 'RTA-8F02', modelo: 'Renault Master L3H2', ano: 2022, capacidade: '16 passageiros', status: 'Em manutenção',
            documentos: {
                ipva: { vencimento: '2026-11-03', valor: 2890, obs: '' },
                licenciamento: { vencimento: '2026-11-20', valor: 160, obs: '' },
                spvat: { vencimento: '2026-11-03', valor: 120, obs: '' },
                selo: { vencimento: '2026-12-01', valor: 250, obs: '' }
            },
            km: { atual: 68900, dataConferencia: '2026-09-25', proxTrocaOleo: 68000, obs: 'Revisão pendente (Troca de óleo vencida)' }
        },
        {
            id: 3, placa: 'LMN-2G89', modelo: 'Fiat Ducato Minibus', ano: 2024, capacidade: '17 passageiros', status: 'Disponível',
            documentos: { ipva: { vencimento: '', valor: 0, obs: '' }, licenciamento: { vencimento: '', valor: 0, obs: '' }, spvat: { vencimento: '', valor: 0, obs: '' }, selo: { vencimento: '', valor: 0, obs: '' } },
            km: { atual: 18400, dataConferencia: '2026-10-02', proxTrocaOleo: 25000, obs: '' }
        },
        {
            id: 4, placa: 'BXD-7A14', modelo: 'Ford Transit 410', ano: 2021, capacidade: '14 passageiros', status: 'Em rota',
            documentos: { ipva: { vencimento: '2026-12-28', valor: 2650, obs: '' }, licenciamento: { vencimento: '', valor: 0, obs: '' }, spvat: { vencimento: '', valor: 0, obs: '' }, selo: { vencimento: '', valor: 0, obs: '' } },
            km: { atual: 82100, dataConferencia: '2026-09-28', proxTrocaOleo: 90000, obs: '' }
        },
        {
            id: 5, placa: 'HJK-9C33', modelo: 'Volkswagen Crafter', ano: 2020, capacidade: '16 passageiros', status: 'Inativo',
            documentos: { ipva: { vencimento: '', valor: 0, obs: '' }, licenciamento: { vencimento: '', valor: 0, obs: '' }, spvat: { vencimento: '', valor: 0, obs: '' }, selo: { vencimento: '', valor: 0, obs: '' } },
            km: { atual: 112000, dataConferencia: '2026-08-15', proxTrocaOleo: 120000, obs: '' }
        },
        {
            id: 6, placa: 'KLP-3B72', modelo: 'Iveco Daily Minibus', ano: 2023, capacidade: '16 passageiros', status: 'Disponível',
            documentos: { ipva: { vencimento: '2027-01-18', valor: 3100, obs: '' }, licenciamento: { vencimento: '', valor: 0, obs: '' }, spvat: { vencimento: '', valor: 0, obs: '' }, selo: { vencimento: '', valor: 0, obs: '' } },
            km: { atual: 34000, dataConferencia: '2026-10-01', proxTrocaOleo: 40000, obs: '' }
        },
        {
            id: 7, placa: 'MNO-6E41', modelo: 'Mercedes Sprinter 416', ano: 2024, capacidade: '15 passageiros', status: 'Disponível',
            documentos: { ipva: { vencimento: '', valor: 0, obs: '' }, licenciamento: { vencimento: '', valor: 0, obs: '' }, spvat: { vencimento: '', valor: 0, obs: '' }, selo: { vencimento: '', valor: 0, obs: '' } },
            km: { atual: 12300, dataConferencia: '2026-10-05', proxTrocaOleo: 20000, obs: '' }
        }
    ],
    motoristas: [
        { id: 1, nome: 'Carlos Eduardo Lima', cnh: '08945123760', categoria: 'D', validade: '2028-08-18' },
        { id: 2, nome: 'Márcia Vieira Souza', cnh: '05478321908', categoria: 'D', validade: '2026-11-11' }, // Vence em 4 dias
        { id: 3, nome: 'João Marcos Reis', cnh: '07321654892', categoria: 'E', validade: '2026-11-21' }, // Vence em 14 dias
        { id: 4, nome: 'Paulo Henrique Alves', cnh: '09123654788', categoria: 'C', validade: '2029-05-24' },
        { id: 5, nome: 'André Luiz Costa', cnh: '04652139877', categoria: 'D', validade: '2026-09-21' } // Vencida
    ],
    clientes: [
        { id: 1, empresa: 'Grupo Horizonte', iniciais: 'GH', contato: 'Ana Martins', telefone: '(11) 98765-4321', obs: 'Transporte executivo diário', status: 'Ativo', rotasRealizadas: 34 },
        { id: 2, empresa: 'Instituto Ideal', iniciais: 'II', contato: 'Ricardo Sales', telefone: '(11) 3456-7890', obs: 'Fretamento matutino', status: 'Ativo', rotasRealizadas: 18 },
        { id: 3, empresa: 'Construtora Vértice', iniciais: 'CV', contato: 'Beatriz Rocha', telefone: '(21) 99876-1204', obs: 'Obras trecho norte', status: 'Ativo', rotasRealizadas: 27 },
        { id: 4, empresa: 'BioSaúde', iniciais: 'BS', contato: 'Marcos Nunes', telefone: '(31) 3344-5566', obs: 'Contrato pausado temporariamente', status: 'Inativo', rotasRealizadas: 12 }
    ],
    rotas: [
        { id: 1, clienteId: 1, veiculoId: 1, motoristaId: 1, data: '2026-11-07', periodo: 'Manhã', horaInicio: '08:00', horaFim: '10:00', status: 'Em andamento' },
        { id: 2, clienteId: 2, veiculoId: 3, motoristaId: 2, data: '2026-11-07', periodo: 'Manhã', horaInicio: '10:30', horaFim: '12:30', status: 'Em andamento' },
        { id: 3, clienteId: 3, veiculoId: 4, motoristaId: 3, data: '2026-11-07', periodo: 'Tarde', horaInicio: '13:45', horaFim: '15:30', status: 'Em andamento' },
        { id: 4, clienteId: 4, veiculoId: 5, motoristaId: 4, data: '2026-11-07', periodo: 'Noite', horaInicio: '18:00', horaFim: '20:00', status: 'Finalizada' }
    ],
    manutencoes: [
        { id: 1, veiculoId: 2, placa: 'RTA-8F02', data: '2026-09-26', tipo: 'Sistema de freios', oficina: 'Auto Center Norte', obs: 'Troca de pastilhas e discos', custo: 2480, status: 'Em andamento' },
        { id: 2, veiculoId: 1, placa: 'QWE-4D21', data: '2026-09-18', tipo: 'Troca de óleo', oficina: 'Oficina Avenida', obs: 'Filtro e óleo motor', custo: 690, status: 'Concluído' },
        { id: 3, veiculoId: 5, placa: 'HJK-9C33', data: '2026-09-12', tipo: 'Pneus', oficina: 'Pneus Brasil', obs: 'Substituição dos pneus dianteiros.', custo: 3220, status: 'Concluído' },
        { id: 4, veiculoId: 3, placa: 'LMN-2G89', data: '2026-09-04', tipo: 'Preventiva', oficina: 'Fiat Pro', obs: 'Revisão preventiva completa.', custo: 1340, status: 'Concluído' }
    ]
};

function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Autenticação e Redefinição de Senha
app.post('/api/login', (req, res) => {
    const { usuario, senha } = req.body;
    const db = readDB();
    const user = db.usuarios.find(u => u.usuario.toUpperCase() === (usuario || '').toUpperCase() && u.senha === senha);
    if (user) {
        res.json({ success: true, token: 'lm-token-2026', nome: user.nome, cargo: user.cargo });
    } else {
        res.status(401).json({ success: false, message: 'Usuário ou senha incorretos.' });
    }
});

app.post('/api/reset-password', (req, res) => {
    const { usuario, novaSenha } = req.body;
    const db = readDB();
    const user = db.usuarios.find(u => u.usuario.toUpperCase() === (usuario || '').toUpperCase());
    if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    user.senha = novaSenha;
    writeDB(db);
    res.json({ success: true, message: 'Senha redefinida com sucesso!' });
});

// Obter todos os dados sincronizados
app.get('/api/dados', (req, res) => {
    res.json(readDB());
});

// Salvar/Atualizar coleções completas ou itens
app.post('/api/sync', (req, res) => {
    const novoEstado = req.body;
    const db = readDB();
    const atualizado = { ...db, ...novoEstado };
    writeDB(atualizado);
    res.json({ success: true, data: atualizado });
});

app.listen(PORT, () => {
    console.log(`Servidor LM Transportes rodando em http://localhost:${PORT}`);
});