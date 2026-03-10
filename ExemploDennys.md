BuildMind AI

Cliente-Alvo:

Construtoras, escritórios de engenharia e arquitetura e departamentos de planejamento técnico de médio a grande porte que operam com projetos DWG/BIM e necessitam de quantitativos automatizados, detecção de conflitos, orçamento 5D e interoperabilidade com ERPs e sistemas corporativos.


A "Dor" Central (O Problema):

A operação com projetos técnicos sofre com trabalho manual e fragmentado. A extração de quantitativos a partir de planilhas e desenhos é lenta e sujeita a erros. A falta de detecção antecipada de conflitos entre disciplinas (estrutura x MEP) gera retrabalho caro no canteiro. Orçamentos dependem de métodos tradicionais desconectados do modelo BIM, e não há repositório único com controle de versões e permissões — cada equipe ou filial acaba com "silos de dados", travando a automação e a visão consolidada da obra.


A Solução (O Core e os 4 Módulos):

O CORE: Motor de Interpretação CAD/BIM (Core IA): É o cérebro do sistema. Ele recebe uploads de arquivos DWG e Revit, converte para formato processável (IFC, JSON ou esquema interno) e extrai automaticamente os elementos estruturais e MEP — paredes, lajes, pilares, portas, janelas, tubulações. Sem essa interpretação correta do modelo, nenhuma outra análise (quantitativos, orçamentos, conflitos) é confiável. O Core garante que todo o restante do fluxo parta de um modelo único e padronizado.


Módulo 1: Extração de Quantitativos (BIM 5D): Automatiza o que hoje é manual. A partir do modelo interpretado pelo Core, calcula área construída, volume de concreto, quantidade de aço, metros de tubulação e superfícies de revestimento. Gera planilhas, relatórios e dados estruturados prontos para integração. Em vez de digitação e planilhas dispersas, o módulo consome o modelo e expõe os quantitativos via API para o orçamento e para sistemas externos (ERPs, BI).


Módulo 2: Detecção de Conflitos e Regras Técnicas (Clash Detection): Analisa o modelo 3D para encontrar conflitos geométricos e violações de regras — tubulação passando por vigas, elementos superpostos, desrespeito a espaçamentos e normativas. Os resultados são expostos no dashboard (conflitos por área/projeto, aderência a normas) e via API, permitindo que a equipe corrija antes do canteiro e reduzindo retrabalho.


Módulo 3: Orçamento e Previsão de Custos (BIM 5D): Recebe os quantitativos extraídos pelo Módulo 1, aplica tabelas de preços (SINAPI, SICRO ou bases corporativas) e gera estimativas de custo completas, com cenários comparativos. Incorpora o custo ao modelo BIM e expõe dados via API para ERPs financeiros e de compras, permitindo planejamento financeiro mais preciso e integrado.


Módulo 4: Colaboração e Versionamento BIM: Repositório central de projetos com controle de versões, histórico completo de alterações, permissões por perfil (engenharia, orçamento, diretoria) e comentários/anotações colaborativas. Controla o acesso via RBAC (cada perfil enxerga apenas o que deve) e garante auditoria e rastreamento. Evita fragmentação: todas as versões e metadados ficam em um único lugar, acessíveis via API para o front-end e para integrações.


O Desafio de Integração/Corporativo:

O projeto se caracteriza como corporativo por sua arquitetura em microserviços, uso de banco relacional e não relacional, comunicação exclusiva via API RESTful entre front-end e back-end, e processamento assíncrono com RabbitMQ. O desafio principal é garantir a consistência dos dados do Core (modelo interpretado e versionado) enquanto os Módulos processam tarefas pesadas em fila (interpretação, quantitativos, clash, orçamento) e expõem APIs seguras para o dashboard de KPIs e para sistemas externos — ERPs, BI e ferramentas de estoque e contratos — consumirem quantitativos, orçamentos e indicadores em tempo (quase) real, com interoperabilidade bem direcionada.


Aluno: Audri Rian