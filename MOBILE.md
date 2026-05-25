# Guia do Desenvolvedor: Aplicativo Android Híbrido com Capacitor e Vercel 📱⚡

Este guia contém as instruções completas para atualizar, testar, e compilar o seu aplicativo de Bíblia (**Hermes Bíblico**) em uma versão nativa do Android usando o **Capacitor**, mantendo os deploys automáticos online via Vercel ou qualquer outro servidor.

---

## 🎨 Arquitetura do App Híbrido

Para manter o seu aplicativo extremamente leve e garantir que todas as modificações feitas na web apareçam instantaneamente no aplicativo sem precisar enviar novas atualizações para a Google Play Store, configuramos o **Capacitor** em modo **Remote WebView** (Servidor Remoto).

1. **Aparência Nativa**: Splash Screen nativa, Barra de Status estilizada, Compartilhamento Nativo usando o menu do Android, e tratamento do botão voltar físico.
2. **Mesma Base de Código**: O projeto web e mobile compartilham o mesmo código exato sem quebrar SSR ou funcionalidades locais.
3. **Deploy Automatizado**: Cada commit que você envia para a Vercel atualiza imediatamente o app rodando nos celulares dos usuários!

---

## 🚀 Comandos Úteis (Facilitados no `package.json`)

Adicionamos atalhos no seu `package.json` para facilitar todos os processos de sincronização e build:

| Comando | O que faz? |
| :--- | :--- |
| `npm run mobile:sync` | Constrói o bundle web (`dist`) e atualiza os arquivos internos do Android. |
| `npm run mobile:open` | Abre o projeto Android diretamente dentro do **Android Studio**. |
| `npm run mobile:build-debug` | Compila o APK de Testes (**Debug**) automaticamente via linha de comando. |
| `npm run mobile:build-release` | Compila o APK de Produção (**Release**) otimizado. |

---

## 🛠️ FASE DE CONFIGURAÇÃO DIRECTA (Vercel ou Produção)

No arquivo `capacitor.config.ts`, você pode alterar a propriedade `server.url` conforme achar necessário para apontar para o seu endereço final de produção. 

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'com.hermesbiblico.app',
  appName: 'Hermes Bíblico',
  webDir: 'dist',
  server: {
    // Substitua pelo endereço final do seu app na Vercel:
    url: 'https://suabiblia.vercel.app', 
    cleartext: true,
    androidScheme: 'https'
  }
};
```

---

## 📦 Como Gerar o APK (Passo a Passo)

### Método 1: Gerando o APK Automático por Linha de Comando (Rápido)

Se você possui o Android SDK e o JDK instalados em sua máquina, basta executar o script automatizado que criamos para você:

```bash
# 1. Compila as novidades da web e sincroniza o Capacitor
npm run mobile:sync

# 2. Gera o APK de Testes (Debug)
npm run mobile:build-debug
```

O arquivo final do APK será gerado em:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

### Método 2: Gerando pelo Android Studio (Recomendado para Produção e Testes)

1. Sincronize o projeto mais recente:
   ```bash
   npm run mobile:sync
   ```
2. Abra o projeto no **Android Studio**:
   ```bash
   npm run mobile:open
   ```
   *(Ou abra o Android Studio manualmente e importe a pasta `./android` do seu projeto)*.
3. **Gerar APK de Testes (Debug)**:
   - Vá no menu superior: `Build` > `Build Bundle(s) / APK(s)` > `Build APK(s)`.
   - O Android Studio compilará e você poderá instalá-lo diretamente no celular com um cabo USB ou enviá-lo pelo WhatsApp!
4. **Gerar APK de Produção Assinado (Release / AAB para Play Store)**:
   - Vá no menu superior: `Build` > `Generate Signed Bundle / APK...`.
   - Escolha **Android App Bundle (AAB)** (obrigatório para novos aplicativos na Google Play Store) ou **APK**.
   - Crie uma chave de assinatura (`KeyStore`) segura, preencha os dados e escolha a variante de build **release**.
   - Pronto! O arquivo `.aab` ou `.apk` pronto para publicação será gerado.

---

## 🌍 Como Publicar e Atualizar o Mobile pela Vercel

Uma das maiores vantagens dessa arquitetura é a **atualização dinâmica instantânea**:

1. **Atualização de Conteúdo, Layout e Lógica**:
   - Faça as alterações que desejar nas suas páginas React (`src/pages/`, `src/components/`, etc.).
   - Faça o commit para a Vercel Normalmente (`git push origin main`).
   - Assim que o deploy na Vercel estiver ativo, **todos os usuários do seu aplicativo Android mobile receberão as atualizações imediatamente**, sem que você precise gerar outro APK ou reenviar para a Play Store!
2. **Quando é necessário atualizar o APK na Play Store?**
   - Somente se você alterar plugins nativos (exemplo: adicionar um plugin de câmera ou de geolocalização no futuro).
   - Se alterar o ícone do aplicativo (que é empacotado dentro do APK).
   - Se mudar o nome do aplicativo ou o ID do pacote (`appId`).

---

## 🔧 Solução de Erros Comuns e Ajustes

### 1. Botão Voltar Físico do Computador/Android
Adicionamos suporte nativo que gerencia o botão voltar do Android. Ele detectará se o usuário possui histórico de navegação interna (por exemplo, saiu da página Home para Leitura Bíblica) e fará a navegação de forma fluida. Se estiver na página inicial, fechará o aplicativo graciosamente.

### 2. Cookies e Persistência de Login (Supabase / IndexedDB)
Por padrão, o Capacitor utiliza uma WebView isolada com persistência ativa. Toda a persistência local (IndexedDB ou `localStorage`) para marcar capítulos como lidos e salvar anotações offline continuará funcionando 100% isolada e segura, tanto no modo online quanto no modo offline de cache.

### 3. Tela Branca Inicial (Redução e Correção)
Habilitamos a integração completa de Splash Screen do Capacitor. A Splash Screen nativa impede que o usuário veja uma tela branca enquanto o JavaScript e o servidor remoto estão sendo carregados, apresentando uma transição extremamente limpa. Você pode customizar a cor de fundo nativa em `capacitor.config.ts` através da chave `android.backgroundColor`.
