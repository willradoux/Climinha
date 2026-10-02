# Climinha

**O clima com personalidade.** Um app de previsão do tempo em que o céu é o ambiente e uma pequena nuvem, o Climinha, sente o clima junto com você.

<p align="center">
  <img src="docs/screenshots/climinha-sunny.jpg" width="260" alt="Climinha feliz em um dia ensolarado" />
  <img src="docs/screenshots/climinha-rain.jpg" width="260" alt="Climinha cinza e chateado na chuva" />
  <img src="docs/screenshots/climinha-night.jpg" width="260" alt="Climinha dormindo em uma noite de céu limpo" />
</p>

<p align="center"><sub>Sol: feliz · Chuva: cinza e chateado · Noite: dormindo</sub></p>

---

## A ideia

A interface segue a disciplina visual das interfaces da Apple (hierarquia tipográfica, conteúdo de ponta a ponta, vidro só onde há interação, movimento sutil), mas a identidade é do Climinha:

- **O céu é o clima.** Gradiente, sol, lua, estrelas, três camadas de nuvens, névoa, chuva e relâmpagos mudam conforme o tempo real da cidade.
- **O Climinha sente o clima.** A cor do corpo e a expressão mudam com o tempo, e ele reage ao que acontece na tela.
- **Informação limpa.** Na primeira tela ficam só a cidade, a temperatura, a condição e a previsão de 10 dias. O resto aparece conforme você rola.

## O Climinha

| Clima | Corpo | Humor |
|---|---|---|
| Sol / céu limpo | branco a azul vivo | feliz |
| Nublado / neblina | cinza-azulado claro | normal |
| Chuva | cinza médio a grafite | chateado, com gotas saindo do corpo |
| Tempestade | quase preto | com medo (e se assusta com os relâmpagos) |
| Noite | branco frio | dormindo |

Comportamentos:

- **Intro:** ele passa bem perto da tela, como uma nuvem atravessando o céu, dá uma piscadinha e encolhe até o lugar dele.
- **Corpo fluido:** o contorno ondula o tempo todo e balança com inércia quando ele se move.
- **Acompanha a interface:** ao rolar, ele se solta do topo e pousa em cima da barra de navegação, centralizado. A velocidade do scroll inclina e estica o corpo. Ao arrastar entre cidades ele continua no centro e balança com a inércia do gesto.
- **Sono:** à noite, um toque o acorda. Depois de 10 s sem interação ele fica com sono e as pálpebras descem devagar. Aos 20 s volta a dormir.

## Funcionalidades

- Previsão de 10 dias com barras de faixa de temperatura
- Previsão por hora, com nascer e pôr do sol na linha do tempo
- Chuva nas próximas 3 horas (aparece só quando há chuva prevista)
- Detalhes: índice UV, sensação térmica, vento com bússola, umidade, precipitação, nascer e pôr do sol
- Várias cidades: troque arrastando a tela (dedo, mouse ou trackpad), pelos pontos da barra ou pelas setas do teclado
- Busca de cidades, localização atual, °C / °F
- Respeita "reduzir movimento" do sistema
- Funciona offline com o último dado salvo

## Stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) + [Vite](https://vite.dev)
- [Motion](https://motion.dev) para animações, molas e movimento ligado ao scroll
- [Open-Meteo](https://open-meteo.com) para previsão e busca de cidades (sem chave de API)

## Rodando localmente

```bash
npm install
npm run dev
```

Outros comandos:

```bash
npm run build     # build de produção em dist/
npm run preview   # serve o build localmente
npm run lint      # oxlint
```

### Simular um clima

Para ver qualquer ambiente sem esperar o tempo mudar:

```
http://localhost:5173/?weather=storm
http://localhost:5173/?weather=rain&night=1
```

Valores: `sunny`, `clear`, `partly`, `cloudy`, `fog`, `rain`, `heavyRain`, `storm`. Com `?debug`, o menu de ajustes ganha um seletor de clima.

## Deploy

O projeto é um site estático. Na [Vercel](https://vercel.com), importe o repositório; o preset **Vite** é detectado automaticamente (build `npm run build`, saída `dist`). Não há variáveis de ambiente.

## Estrutura

```
src/
├── climinha/       personagem: SVG, corpo fluido, humores e cores por clima
├── environment/    céu em camadas: nuvens, sol, lua, estrelas, névoa, chuva, relâmpago
├── components/     hero, cards, intro, barra de navegação, lista de cidades
├── theme/          tokens de design, temas por clima, tokens de movimento
├── weather/        cliente Open-Meteo, cache, formatação
└── icons/          ícones de clima e de interface próprios
```

## Créditos

Dados meteorológicos por [Open-Meteo](https://open-meteo.com) (CC BY 4.0).
