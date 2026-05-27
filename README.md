🏫 Sistema de Gestão Comportamental

Uma aplicação web desenvolvida para auxiliar professores e instituições de ensino no registro e acompanhamento do comportamento dos alunos em sala de aula. O sistema permite um lançamento diário rápido, visual e estruturado, substituindo as anotações manuais em papel.

✨ Funcionalidades

🔒 Controle de Acesso Seguro: Sistema de login onde o professor se cadastra, mas só ganha acesso ao painel após a aprovação de um administrador (coordenação/direção).

👥 Gestão Escolar: Cadastro e gerenciamento prático de Turmas e Alunos (ordenados automaticamente em ordem alfabética).

📝 Lançamento Diário Ágil: Interface otimizada para registrar presenças e múltiplos comportamentos negativos com apenas alguns cliques, utilizando ícones visuais.

📊 Dashboard Analítico: Visão consolidada com destaques positivos (alunos sem ocorrências) e alertas de atenção prioritária (alunos em estado crítico).

🌡️ Termômetro Comportamental: Indicador visual (Excelente, Atenção, Preocupante, Crítico) que calcula a gravidade do histórico de cada aluno.

🤝 Registro de Intervenções: Espaço para documentar as ações corretivas tomadas pelo professor (ex: advertência, encaminhamento à coordenação).

⚙️ Configurações Dinâmicas: Permite adicionar, editar ou remover tipos de comportamentos negativos e ações padrão a qualquer momento.

🛠️ Tecnologias Utilizadas

React + Vite: Biblioteca principal e ferramenta de build rápida.

Tailwind CSS: Estilização moderna, responsiva e padronizada.

Firebase:

Authentication: Gestão de usuários e login seguro.

Firestore Database: Banco de dados NoSQL em tempo real.

Lucide React: Biblioteca de ícones elegantes e sóbrios.

GitHub Pages: Hospedagem da aplicação web.

🚀 Como rodar este projeto localmente

1. Pré-requisitos

Você precisará ter o Node.js e o Git instalados na sua máquina.

2. Clonar o repositório

git clone https://github.com/SEU_USUARIO/sistema-gestao-comportamental.git
cd sistema-gestao-comportamental


3. Instalar as dependências

npm install


4. Configurar as Variáveis de Ambiente (Firebase)

Crie um arquivo chamado .env na raiz do projeto (mesmo nível do package.json) e insira as suas chaves do Firebase seguindo este modelo:

VITE_FIREBASE_API_KEY="SUA_API_KEY"
VITE_FIREBASE_AUTH_DOMAIN="seu-projeto.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="seu-projeto"
VITE_FIREBASE_STORAGE_BUCKET="seu-projeto.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"


5. Iniciar o servidor de desenvolvimento

npm run dev


O aplicativo estará disponível no seu navegador em http://localhost:5173.

🔐 Regras de Segurança do Firebase

Para garantir a segurança dos dados, o banco de dados (Firestore) está configurado com as seguintes regras, permitindo acesso apenas a usuários autenticados:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}


🌐 Deploy

O deploy contínuo pode ser feito para o GitHub Pages utilizando o comando:

npm run deploy


(Certifique-se de que o parâmetro base no arquivo vite.config.js esteja configurado com o nome exato do seu repositório).

Desenvolvido com 💻 para facilitar a rotina docente.