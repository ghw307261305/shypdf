// Brazilian Portuguese (pt-BR) tool-page SEO content. Structure must match content/en.ts.
import type { ToolContent } from './en';

const content: Record<string, ToolContent> = {
  'merge-pdf': {
    seoTitle: 'Juntar PDF online — grátis, sem upload | ShyPDF',
    sections: [
      { h: 'Junte PDFs sem mandar nada para lugar nenhum', p: [
        'A maioria dos sites para juntar PDF funciona assim: seus documentos são enviados para um servidor, unidos lá e devolvidos para você. O ShyPDF faz essa união dentro da aba do seu navegador. Os PDFs que você escolhe são lidos do seu disco para a memória, combinados no seu próprio dispositivo e salvos direto na sua pasta de downloads.',
        'Por isso ele combina bem com os documentos que as pessoas mais precisam juntar: contratos assinados, extratos bancários, declarações de imposto, prontuários médicos e documentos de identidade digitalizados — arquivos que você prefere não entregar a terceiros só para grampeá-los uns aos outros.' ] },
      { h: 'Como acertar a ordem', p: [
        'Os arquivos são unidos na ordem em que os cartões aparecem na tela. Arraste um cartão para movê-lo, use os botões ‹ › no celular ou clique em “Ordenar por nome” se seus arquivos forem numerados (file2 fica antes de file10). Precisa só de algumas páginas de um dos arquivos? Passe-o antes pela ferramenta Dividir PDF e depois junte as partes.',
        'Cada arquivo de origem ganha um marcador de primeiro nível no documento final, para que o leitor possa pular de um arquivo original para outro pela barra lateral do visualizador de PDF. Desmarque “Adicionar um marcador para cada arquivo” se preferir um sumário limpo.' ] },
    ],
    faq: [
      { q: 'Juntar PDFs reduz a qualidade?', a: 'Não. As páginas são copiadas para o novo arquivo do jeito que estão — texto continua sendo texto e as imagens não são recomprimidas. Se o resultado ficar grande demais para enviar por e-mail, passe-o depois pela ferramenta Comprimir PDF.' },
    ],
  },
  'split-pdf': {
    seoTitle: 'Dividir PDF online — extraia páginas, sem upload | ShyPDF',
    sections: [
      { h: 'Extraia exatamente as páginas que você precisa', p: [
        'Digite os intervalos de páginas como faria na janela de impressão: 1-3, 5, 8-10. Cada parte separada por vírgula vira um PDF próprio, então esse exemplo gera três arquivos — páginas 1–3, página 5 e páginas 8–10. Para tirar um único capítulo de um relatório longo, digite apenas um intervalo.',
        'Os outros modos resolvem os casos mais comuns sem precisar digitar nada: “Um arquivo por página” separa o documento em páginas avulsas, e as opções de páginas ímpares e pares ajudam a corrigir digitalizações feitas em scanner de um lado só.' ] },
      { h: 'O que você recebe', p: [
        'Quando a divisão gera vários arquivos, eles vêm reunidos em um único zip, para que o navegador não pergunte sobre cada arquivo separadamente; com seis arquivos ou menos, você também pode baixá-los um a um. As páginas são copiadas sem recompressão, então a qualidade é idêntica à do original.',
        'A divisão acontece inteiramente no seu navegador. O documento nunca é enviado, e isso faz diferença quando o motivo da divisão é justamente compartilhar uma página inofensiva de um arquivo sensível.' ] },
    ],
  },
  'organize-pdf': {
    seoTitle: 'Organizar PDF — reordene, gire e exclua páginas online | ShyPDF',
    sections: [
      { h: 'Reorganize um PDF olhando para ele', p: [
        'O Organizar PDF mostra todas as páginas como miniaturas. Arraste as páginas para uma nova ordem, clique em × para descartar as que você não precisa — páginas em branco do scanner, uma folha de rosto, um anexo — e use ↻ para girar uma única página. No celular, os botões ‹ › movem a página uma posição por vez.',
        'Quando a ordem estiver certa, “Salvar PDF” grava um novo arquivo só com essas páginas, nessa ordem. Seu arquivo original não é modificado.' ] },
      { h: 'Privado desde a concepção', p: [
        'As miniaturas são renderizadas no seu próprio dispositivo, assim como o novo PDF. Nada é enviado, o que significa que você pode arrumar com segurança documentos que contêm informações pessoais ou confidenciais. Documentos grandes também funcionam; as miniaturas são desenhadas conforme necessário, então um arquivo com centenas de páginas só leva alguns segundos a mais para aparecer.' ] },
    ],
  },
  'add-page-numbers': {
    seoTitle: 'Inserir números de página em PDF — sem upload | ShyPDF',
    sections: [
      { h: 'Numeração do jeito que os documentos são montados de verdade', p: [
        'Relatórios e trabalhos acadêmicos raramente começam a numeração na primeira folha. Defina “Começar na página” para pular a capa ou o sumário, e “Primeiro número” para escolher o que aparece na primeira página numerada — por exemplo, começar na página 3 com o número 1. Escolha qualquer canto ou o centro da borda superior ou inferior, e ajuste a margem para que o número não fique em cima de rodapés já existentes.',
        'Os formatos incluem números simples, “1 / 10”, “- 1 -” e “Página 1”, além de formatos chineses. O tamanho da fonte pode ser ajustado de 6 a 48 pt.' ] },
      { h: 'Funciona em qualquer PDF e fica no seu dispositivo', p: [
        'Os números são desenhados por cima de cada página, então a ferramenta funciona tanto em documentos digitalizados quanto em PDFs exportados do Word ou do Google Docs. O arquivo é processado no seu navegador e nunca é enviado. Vai reunir vários documentos em um só? Junte-os primeiro e numere o resultado depois, para que a sequência percorra o arquivo inteiro.' ] },
    ],
  },
  'add-watermark': {
    seoTitle: 'Inserir marca d\'água em PDF — grátis, sem upload | ShyPDF',
    sections: [
      { h: 'Identifique rascunhos, cópias e documentos confidenciais', p: [
        'Digite qualquer texto — CONFIDENCIAL, RASCUNHO, o nome de um cliente, “Cópia exclusiva para pedido de visto” — e o ShyPDF o aplica em todas as páginas. Escolha uma marca única centralizada ou repita-a por toda a página, e ajuste o tamanho, o ângulo, a cor e a opacidade até que ela fique visível sem esconder o conteúdo que está por baixo.',
        'Uma marca d\'água repetida e semitransparente com o nome do destinatário é uma forma prática de desencorajar que a cópia de um documento de identidade ou de um contrato seja reaproveitada onde você não pretendia.' ] },
      { h: 'Qualquer idioma, sem upload', p: [
        'O texto é desenhado com as fontes do seu dispositivo, então escritas como chinês, japonês, árabe ou cirílico funcionam tão bem quanto o alfabeto latino. Como todo o trabalho é feito no seu navegador, o documento que você está tentando proteger não é enviado a ninguém no processo.' ] },
    ],
  },
  'jpg-to-pdf': {
    seoTitle: 'JPG para PDF — converta grátis, sem upload | ShyPDF',
    sections: [
      { h: 'Transforme fotos e digitalizações em um único PDF organizado', p: [
        'Selecione imagens JPG, PNG ou WebP — fotos de recibos tiradas com o celular, páginas digitalizadas, capturas de tela — e o ShyPDF coloca uma imagem em cada página de um único PDF. Arraste os cartões para definir a ordem das páginas antes de converter.',
        'Escolha “Igual à imagem” para manter cada foto no tamanho natural, ou A4 / Letter para ter páginas uniformes com a imagem ajustada à página, que costuma ser o que um portal de inscrição ou uma impressora espera. A orientação pode acompanhar cada imagem ou ser fixada em retrato ou paisagem.' ] },
      { h: 'Suas fotos ficam no seu dispositivo', p: [
        'Fotos de documentos costumam conter exatamente o que você não deveria enviar para a internet: assinaturas, endereços, números de documentos. Aqui a conversão acontece no seu navegador e as imagens nunca saem do seu dispositivo. Marque “Comprimir imagens” se o PDF final precisar ser pequeno o bastante para ir por e-mail.' ] },
    ],
    faq: [
      { q: 'Posso converter fotos HEIC do iPhone?', a: 'Não diretamente. Converta-as para JPG antes — no iPhone, enviar a foto por e-mail para você mesmo geralmente já faz isso automaticamente; ou defina Ajustes → Câmera → Formatos como “Mais Compatível” para que as novas fotos sejam salvas em JPG.' },
    ],
  },
  'pdf-to-jpg': {
    seoTitle: 'PDF para JPG — converta grátis, sem upload | ShyPDF',
    sections: [
      { h: 'Salve páginas de PDF como imagens', p: [
        'Cada página do seu PDF é renderizada como uma imagem JPG ou PNG. Use JPG para fotos e digitalizações, quando o tamanho do arquivo importa, e PNG para páginas com texto nítido, diagramas ou capturas de tela, quando você quer contornos bem definidos. Deixe o campo de páginas em branco para converter tudo, ou digite intervalos como 1-3, 5 para exportar só algumas páginas.',
        'Escolha a resolução de acordo com o destino: 96 dpi para a web e aplicativos de mensagens, 150 dpi para uso geral em tela, 300 dpi para impressão. Resoluções mais altas geram arquivos maiores e demoram mais para renderizar.' ] },
      { h: 'Renderizado localmente', p: [
        'As páginas são desenhadas pelo seu próprio navegador, com o mesmo mecanismo de código aberto (PDF.js) usado pelo visualizador de PDF do Firefox. O PDF nunca é enviado. Quando você converte mais de uma página, as imagens vêm reunidas em um único zip.' ] },
    ],
  },
  'pdf-to-word': {
    seoTitle: 'PDF para Word — converta grátis, sem upload | ShyPDF',
    sections: [
      { h: 'Um documento editável, não uma foto dele', p: [
        'O ShyPDF lê o texto do seu PDF junto com a posição, a fonte e o tamanho, e reconstrói conteúdo de verdade do Word a partir disso: parágrafos corridos que você pode reescrever, títulos que aparecem no painel de navegação do Word, negrito e itálico, alinhamento, recuos, tabelas simples e imagens. O tamanho da página e as margens são mantidos, e cada página do PDF começa em uma nova página no Word.',
        'Um PDF não guarda parágrafos nem tabelas — só o lugar onde cada caractere é desenhado —, então a conversão é uma reconstrução bem fundamentada. Ela funciona melhor em documentos que nasceram em um editor de texto: cartas, contratos, relatórios, trabalhos acadêmicos e currículos. Layouts com várias colunas são lidos coluna por coluna. Páginas com muito design, formulários e texto sobre imagens saem simplificados.' ] },
      { h: 'O arquivo que você quer converter costuma ser justamente o sensível', p: [
        'As pessoas convertem PDFs para Word para editar contratos, preencher dados em cartas oficiais ou atualizar o currículo. Na maioria dos conversores online, isso significa enviar o documento para uma empresa sobre a qual você não sabe nada. Aqui a conversão roda dentro da aba do seu navegador, e o PDF nunca sai do seu dispositivo.',
        'Se o resultado disser que seu PDF não tem texto selecionável, ele é uma digitalização. Use a ferramenta OCR PDF para reconhecer o texto primeiro e depois converta o PDF pesquisável.' ] },
    ],
    faq: [
      { q: 'Quais aplicativos abrem o resultado?', a: 'É um arquivo .docx padrão, então Microsoft Word, Google Docs, LibreOffice Writer, Apple Pages e WPS Office conseguem abri-lo.' },
    ],
  },
  'word-to-pdf': {
    seoTitle: 'Word para PDF — converta grátis, sem upload | ShyPDF',
    sections: [
      { h: 'Um PDF de verdade, gerado no seu próprio dispositivo', p: [
        'O ShyPDF lê o arquivo .docx, faz a diagramação de cada página por conta própria e grava um PDF com texto selecionável e pesquisável e fontes incorporadas — não uma captura de tela do documento. Estilos, títulos, listas com marcadores e numeradas, tabelas com bordas e sombreamento, imagens, hiperlinks, cabeçalhos, rodapés e números de página são todos mantidos, com o tamanho de página e as margens definidos no documento.',
        'Nada é enviado a um servidor. Isso faz diferença para os documentos que as pessoas costumam transformar em PDF antes de mandar: propostas, faturas, contratos, currículos e cartas de apresentação.' ] },
      { h: 'Por que as quebras de página batem com as do Word', p: [
        'Documentos do Word costumam indicar fontes que só vêm com o Microsoft Office. O ShyPDF as substitui por fontes de código aberto projetadas para ter exatamente as mesmas larguras de caracteres — Carlito no lugar de Calibri, Arimo no de Arial, Tinos no de Times New Roman, Cousine no de Courier New —, então o texto quebra de linha nas mesmas palavras e as páginas quebram praticamente nos mesmos lugares. O desenho das letras muda um pouco; o layout, não. Textos em chinês, japonês e coreano usam Noto Sans.',
        'Algumas coisas ainda não são compatíveis: seções com várias colunas, texto contornando imagens flutuantes, gráficos, SmartArt e escritas da direita para a esquerda. O texto dentro de caixas de texto é mantido, mas colocado no fluxo normal da página. Para um documento que dependa desses recursos, exportar para PDF pelo próprio Word será mais fiel.' ] },
    ],
    faq: [
      { q: 'As alterações controladas e os comentários são incluídos?', a: 'O PDF mostra o documento com todas as alterações controladas aceitas: o texto inserido aparece, o texto excluído não. Os comentários ficam de fora.' },
    ],
  },
  'compress-pdf': {
    seoTitle: 'Comprimir PDF online — grátis, sem upload | ShyPDF',
    sections: [
      { h: 'Dois modos, porque PDFs ficam grandes por motivos diferentes', p: [
        'O modo Leve reconstrói a estrutura interna do arquivo e remove dados redundantes. O texto continua selecionável e pesquisável, e nada muda visualmente; a economia típica é de 5 a 30%. É a primeira tentativa certa para documentos exportados do Word, do Google Docs ou de ferramentas de design.',
        'O modo Forte renderiza cada página como uma imagem JPEG e monta um novo PDF a partir dessas imagens. Isso é muito eficaz em documentos digitalizados e arquivos cheios de fotos — muitas vezes mais de 50% menor —, mas o texto deixa de ser selecionável, então guarde o original. Escolha 72, 110 ou 150 dpi, dependendo de o resultado precisar ser legível apenas na tela ou também impresso.' ] },
      { h: 'Honesto sobre o resultado', p: [
        'O ShyPDF mostra o tamanho antes e depois. Se a compressão não deixar o arquivo menor — o que acontece com PDFs que já estão otimizados —, ele devolve o original em vez de uma cópia “comprimida” maior.',
        'Tudo acontece no seu navegador e o arquivo nunca é enviado, então você pode reduzir um extrato bancário ou um contrato até caber no limite de anexo do e-mail sem compartilhá-lo com um serviço de compressão.' ] },
    ],
    faq: [
      { q: 'Que tamanho um PDF precisa ter para ir por e-mail?', a: 'O Gmail aceita anexos de até 25 MB e o Outlook.com de até 20 MB, mas muitos servidores de e-mail corporativos definem limites menores, normalmente 10 MB. Se o modo Forte a 110 dpi ainda ficar grande demais, tente 72 dpi, ou divida o documento e envie em partes.' },
    ],
  },
  'ocr-pdf': {
    seoTitle: 'OCR PDF — PDF digitalizado pesquisável, sem upload | ShyPDF',
    sections: [
      { h: 'Transforme uma digitalização em um PDF pesquisável', p: [
        'Um PDF digitalizado é uma pilha de imagens: não dá para pesquisar nele, selecionar uma frase nem copiar um número. O OCR (reconhecimento óptico de caracteres) lê o texto dessas imagens. O ShyPDF coloca as palavras reconhecidas em uma camada invisível exatamente em cima das digitalizadas, então o Ctrl+F, a seleção de texto e o copiar e colar funcionam, enquanto a página continua com a mesma aparência de antes.',
        'As páginas originais não são recomprimidas nem redesenhadas, então não há perda de qualidade e o arquivo só cresce o equivalente ao tamanho do texto. Se você só quer as palavras, escolha “Texto simples (.txt)”. Páginas que já contêm texto selecionável são puladas por padrão, o que agiliza documentos mistos.' ] },
      { h: 'Como obter bons resultados', p: [
        'Escolha o idioma em que o documento está escrito — é o fator que mais pesa na precisão. Estão disponíveis inglês, espanhol, português, francês, alemão, italiano, japonês e chinês simplificado, e “Reconhecer também inglês” ajuda em documentos que misturam termos em inglês com outro idioma.',
        'O reconhecimento roda no seu navegador com o Tesseract, um mecanismo de OCR de código aberto consolidado há muitos anos, compilado para WebAssembly. Conte com alguns segundos por página, dependendo do seu dispositivo. Digitalizações de extratos bancários, documentos de identidade, prontuários médicos e contratos assinados são exatamente o tipo de arquivo que não deveria ser enviado a um serviço de OCR; aqui eles nunca saem do seu dispositivo.' ] },
    ],
    faq: [
      { q: 'Posso fazer OCR em uma foto ou em um JPG?', a: 'Sim, em duas etapas: transforme as imagens em um PDF com a ferramenta JPG para PDF e depois passe esse PDF pela ferramenta OCR PDF.' },
    ],
  },
  'unlock-pdf': {
    seoTitle: 'Desbloquear PDF — remova a senha que você conhece | ShyPDF',
    sections: [
      { h: 'Para seus próprios documentos, quando a senha atrapalha', p: [
        'Bancos, empresas de folha de pagamento e portais do governo costumam enviar extratos e comprovantes como PDFs protegidos por senha. Isso faz sentido durante o envio e vira um incômodo depois: você precisa digitar a senha toda vez e não consegue juntar o arquivo com outros. Digite a senha uma vez e o ShyPDF salva uma cópia que abre normalmente.',
        'Alguns PDFs abrem sem senha, mas bloqueiam impressão, cópia ou edição. Se um documento assim é seu, ou se o dono pediu que você trabalhasse nele, o ShyPDF pode salvar uma cópia sem essas restrições. Você vai precisar confirmar que tem o direito de fazer isso.' ] },
      { h: 'O que esta ferramenta não faz', p: [
        'O ShyPDF não descobre, não tenta adivinhar e não recupera senhas. Se um arquivo pede senha para abrir e você não a tem, esta ferramenta não pode ajudar. Ela serve para remover a proteção de documentos que você tem o direito de modificar, e não para retirar a proteção de obras de outras pessoas.',
        'A senha que você digita e o próprio documento ficam no seu dispositivo: a descriptografia é feita no seu navegador pelo qpdf, uma biblioteca de PDF de código aberto consolidada há muitos anos, compilada para WebAssembly. Nada é enviado.' ] },
    ],
  },
  'protect-pdf': {
    seoTitle: 'Proteger PDF com senha — AES-256, sem upload | ShyPDF',
    sections: [
      { h: 'Criptografe um PDF antes de enviá-lo', p: [
        'Defina uma senha de abertura e o documento é criptografado com AES-256; ninguém consegue lê-lo sem a senha, seja qual for o leitor de PDF usado. Compartilhe a senha por um canal diferente do arquivo — mande o PDF por e-mail e a senha por mensagem de texto, por exemplo.',
        'Você também pode restringir impressão, cópia ou edição. Mas saiba o que isso significa: as restrições de permissão são aplicadas pelos leitores de PDF, e não pela criptografia do conteúdo, então encare-as como uma declaração clara de intenção, não como proteção forte. Para qualquer coisa sensível, use uma senha de abertura.' ] },
      { h: 'A senha nunca sai do seu navegador', p: [
        'Em um serviço baseado em upload, tanto o seu documento confidencial quanto a senha que o protege viajam até o servidor de outra pessoa. Aqui, a criptografia é feita no seu dispositivo pelo qpdf, uma biblioteca de PDF de código aberto compilada para WebAssembly, e nem o arquivo nem a senha são enviados a lugar nenhum.',
        'Não há como recuperar uma senha esquecida — nem para você, nem para nós, já que nunca a vemos. Guarde-a em um gerenciador de senhas.' ] },
    ],
    faq: [
      { q: 'O que faz uma boa senha para PDF?', a: 'O comprimento é o que mais importa. Quatro ou cinco palavras aleatórias, ou 14 ou mais caracteres aleatórios gerados por um gerenciador de senhas, são muito mais fortes do que uma senha curta com símbolos. Evite datas de nascimento e números de documentos, que são as primeiras coisas que um invasor tenta.' },
    ],
  },
  'sign-pdf': {
    seoTitle: 'Assinar PDF online grátis — sem upload nem cadastro | ShyPDF',
    sections: [
      { h: 'Assine sem imprimir, digitalizar nem se cadastrar', p: [
        'Abra o PDF, crie sua assinatura e arraste-a até a linha de assinatura. Você pode desenhá-la com o mouse, o dedo ou uma caneta stylus, digitar seu nome em um estilo manuscrito ou usar uma foto da sua assinatura em papel branco — o ShyPDF remove o fundo do papel para que só a tinta permaneça. Use as setas de página para chegar à página certa, arraste a alça para mudar o tamanho e marque “Colocar em todas as páginas” quando o documento precisar de rubrica em todas as folhas.',
        'A assinatura é desenhada na própria página, então aparece em qualquer leitor de PDF e também na impressão. Seu arquivo original não é alterado; você baixa uma cópia assinada.' ] },
      { h: 'Sua assinatura não é coisa que se envie para um servidor', p: [
        'Uma assinatura junto com um contrato assinado é praticamente o que há de mais sensível em matéria de documentos. A maioria dos sites de assinatura eletrônica guarda os dois em seus servidores, e muitos exigem uma conta. O ShyPDF faz todo o trabalho no seu navegador: o PDF e a assinatura ficam no seu dispositivo, nada é guardado entre uma visita e outra e não existe conta.',
        'Esta é uma assinatura eletrônica simples — o equivalente a assinar uma folha impressa — e não uma assinatura digital baseada em certificado. Ela é amplamente aceita na papelada do dia a dia, mas alguns documentos exigem mais por lei; na dúvida, pergunte ao destinatário. Para impedir que o arquivo assinado seja editado depois, passe-o pela ferramenta Proteger PDF e restrinja a edição.' ] },
    ],
  },
  'crop-pdf': {
    seoTitle: 'Recortar PDF online — corte margens, sem upload | ShyPDF',
    sections: [
      { h: 'Corte o PDF para deixar só o que importa', p: [
        'Arraste uma única caixa sobre a área que quer manter e tudo o que fica fora dela é cortado — em todas as páginas ou só na atual. Margens largas de scanner, bordas com furos de fichário, a metade vazia de uma apostila de slides: tudo some em alguns segundos, com uma pré-visualização ao vivo para você ver exatamente onde o corte cai.',
        'O recorte ajusta a caixa de recorte de cada página, a configuração que todo leitor de PDF usa para decidir o que exibir e imprimir. O conteúdo da página não é renderizado de novo nem recomprimido, então o texto continua selecionável e as imagens continuam nítidas.' ] },
      { h: 'O que o recorte é — e o que não é', p: [
        'Como só a área visível muda, a página inteira continua guardada dentro do arquivo, e ferramentas que redefinem a caixa de recorte podem trazer de volta as partes cortadas. Isso faz do recorte a ferramenta certa para arrumar layouts, e a errada para esconder informações confidenciais — para isso, cubra o conteúdo com uma caixa preta na ferramenta Editar PDF, que realmente pinta por cima.',
        'Como toda ferramenta do ShyPDF, o recorte roda no seu navegador; o arquivo nunca é enviado.' ] },
    ],
  },
  'delete-pages': {
    seoTitle: 'Excluir páginas de PDF online — sem upload | ShyPDF',
    sections: [
      { h: 'Remova páginas olhando para elas, ou pelo número', p: [
        'Todas as páginas aparecem como miniaturas. Clique em × nas páginas em branco do scanner, na folha de rosto que você não precisa, nas digitalizações duplicadas — e salve o que sobrou como um novo PDF. Se você já sabe os números, digite-os: 2, 5-7 exclui a página 2 e as páginas 5 a 7 de uma vez.',
        'As páginas restantes são copiadas exatamente como estão, sem recompressão, então o novo arquivo não perde nada em qualidade. Seu PDF original não é tocado; você baixa uma cópia mais curta.' ] },
      { h: 'O motivo de sempre: enviar só o necessário', p: [
        'Ninguém exclui páginas por diversão — o arquivo sendo enxugado geralmente é um extrato bancário, um contrato ou um pacote de digitalizações a caminho da caixa de entrada de outra pessoa. Fazer o corte no seu navegador significa que o documento completo, incluindo as páginas que você está removendo, nunca viaja até um servidor.' ] },
    ],
  },
  'extract-pages': {
    seoTitle: 'Extrair páginas de PDF — novo arquivo, sem upload | ShyPDF',
    sections: [
      { h: 'Um novo PDF só com as páginas que você escolher', p: [
        'Digite os intervalos como uma janela de impressão aceita — 1-3, 5, 8-10 — e as páginas selecionadas são copiadas, na ordem do documento, para um único PDF novo. É o jeito mais rápido de tirar um capítulo de um relatório, um anexo de um processo ou as duas páginas que o cliente realmente precisa de uma digitalização de quarenta.',
        'As páginas são copiadas sem recompressão, então o resultado é idêntico ao original, pixel por pixel. O arquivo de origem fica como está.' ] },
      { h: 'Extrair ou Dividir?', p: [
        'Elas respondem a perguntas diferentes. A ferramenta Extrair páginas de PDF gera um único arquivo com tudo o que você seleciona — o certo quando o resultado deve viajar como um único anexo. A Dividir PDF gera um arquivo separado por intervalo — o certo quando você está desmontando um documento. Se você extrair as páginas e depois quiser outra ordem, passe o resultado pela ferramenta Organizar PDF.' ] },
    ],
  },
  'edit-pdf': {
    seoTitle: 'Editar PDF online — texto e destaques, sem upload | ShyPDF',
    sections: [
      { h: 'As edições que as pessoas realmente precisam, sem um editor completo', p: [
        'A maioria dos momentos de “editar um PDF” é pequena: adicionar uma linha de texto onde o formulário espera letra de mão, destacar a cláusula que importa, cobrir com corretivo um telefone antigo e digitar o novo por cima. O ShyPDF deixa esses quatro movimentos — texto, destaque, corretivo, caixa preta — a um clique de distância. Coloque um elemento na página, arraste-o até a posição certa e mude o tamanho pela alça no canto.',
        'O texto é desenhado com as fontes do seu dispositivo, então chinês, japonês, árabe ou qualquer outra escrita que seu sistema exiba funciona. Cada página do PDF mantém a qualidade; suas edições são desenhadas por cima e se tornam parte permanente da cópia salva.' ] },
      { h: 'Editar um PDF não deveria significar enviá-lo', p: [
        'Os PDFs que as pessoas editam são contratos, inscrições, extratos e documentos de identidade — documentos no topo da lista do que não se deve enviar para a internet. Aqui toda a edição acontece na aba do seu navegador; o arquivo nunca sai do seu dispositivo, e o original no disco fica intocado.',
        'Um PDF guarda caracteres desenhados, não parágrafos editáveis, então nenhuma ferramenta de navegador consegue redigitar o texto existente no lugar. Para reescrever um documento, converta-o com a ferramenta PDF para Word, edite-o com calma e converta de volta com a Word para PDF.' ] },
    ],
  },
  'fill-pdf': {
    seoTitle: 'Preencher formulário PDF online — sem upload | ShyPDF',
    sections: [
      { h: 'Digite em campos de formulário de verdade', p: [
        'Se o seu PDF tem campos de formulário de verdade — daqueles em que o cursor aparece quando você clica —, o ShyPDF lista todos os campos de texto, caixas de seleção, botões de opção e listas suspensas, na ordem do documento, prontos para preencher pelo teclado. Uma pré-visualização da página fica ao lado, para você conferir o resultado enquanto avança.',
        'Ao salvar, as respostas são gravadas no próprio formulário. Marque “Achatar o formulário” e elas são convertidas em conteúdo fixo da página: nada pode ser editado ou apagado sem querer depois, e o formulário aparece igual em qualquer leitor — a escolha mais segura quando o próximo destino é a caixa de entrada de alguém.' ] },
      { h: 'Formulários são exatamente os arquivos que deveriam ficar no dispositivo', p: [
        'Um formulário preenchido é cheio de dados pessoais: nomes, endereços, números de documentos, valores de salário. Preenchê-lo no navegador significa que nem o formulário em branco nem as suas respostas chegam a um servidor.',
        'Se nada acontece quando você clica nos campos em outros aplicativos, o PDF provavelmente é um formulário digitalizado ou “impresso”, sem campos de verdade. O ShyPDF avisa quando é o caso — use a ferramenta Editar PDF para digitar por cima de um formulário assim, e a Assinar PDF para adicionar a assinatura.' ] },
    ],
  },
  'png-to-pdf': {
    seoTitle: 'PNG para PDF — converta grátis, sem upload | ShyPDF',
    sections: [
      { h: 'Capturas de tela e gráficos em um único PDF limpo', p: [
        'PNG é o formato das capturas de tela, dos diagramas, dos gráficos e dos slides exportados — imagens com contornos definidos e cores exatas. O ShyPDF coloca cada imagem em uma página própria do PDF, na ordem que você define arrastando os cartões. Mantenha cada página no tamanho natural da imagem, ou escolha A4 / Letter para páginas uniformes que imprimem de forma previsível.',
        'Os PNGs são incorporados sem recompressão, então uma captura de tela no PDF é, pixel por pixel, a captura que você fez. As áreas transparentes ficam sobre o fundo branco da página. Imagens JPG e WebP podem ser misturadas à vontade.' ] },
      { h: 'Convertido no seu dispositivo', p: [
        'Capturas de tela têm a mania de conter mais do que se pretendia — nomes, números de conta, metade de uma conversa de e-mail. A conversão roda inteiramente no seu navegador, então as imagens nunca saem do seu dispositivo. Se o resultado precisar ser pequeno o bastante para ir por e-mail, marque “Comprimir imagens”.' ] },
    ],
  },
  'pdf-to-png': {
    seoTitle: 'PDF para PNG — converta grátis, sem upload | ShyPDF',
    sections: [
      { h: 'Imagens sem perdas de cada página', p: [
        'Cada página do PDF é renderizada como PNG — o formato certo quando a página tem texto, tabelas, diagramas ou telas de aplicativos: os contornos ficam nítidos, as cores ficam exatas e não há os artefatos de compressão que o JPG deixa ao redor das letras. Converta o arquivo inteiro ou só as páginas que você listar, a 96, 150 ou 300 dpi, dependendo do destino da imagem.',
        'Várias páginas chegam reunidas em um único zip. Precisa de arquivos menores para páginas cheias de fotos? A opção JPG está a um clique, na mesma ferramenta.' ] },
      { h: 'Renderizado pelo seu próprio navegador', p: [
        'As páginas são desenhadas localmente pelo PDF.js — o mecanismo que vem dentro do Firefox — e o PDF nunca é enviado. Um slide que você transforma em PNG para uma apresentação, ou a página de um extrato de que você precisa como imagem para um portal de inscrição, fica no seu dispositivo do começo ao fim.' ] },
    ],
  },
  'pdf-to-text': {
    seoTitle: 'PDF para Texto — extraia texto simples, sem upload | ShyPDF',
    sections: [
      { h: 'Todas as palavras, nada da formatação', p: [
        'O ShyPDF lê a camada de texto do PDF e a grava em um arquivo .txt simples: as quebras de linha são mantidas, as páginas podem ser marcadas, e todo o resto é removido. É exatamente o que você quer para entregar um documento a um script, a uma ferramenta de tradução ou a um modelo de IA, para contar palavras ou para colar em algum lugar que briga com a formatação de PDF.',
        'Limite a extração a certas páginas com intervalos como 1-3, 5. Os marcadores de quebra de página facilitam rastrear qualquer linha de volta até a origem.' ] },
      { h: 'Quando a saída vem vazia', p: [
        'Um PDF digitalizado não tem camada de texto — é uma fotografia de texto —, então não há nada para extrair. Passe a digitalização pela ferramenta OCR PDF; ela reconhece as palavras nas imagens das páginas e pode gerar texto simples diretamente. E quando você precisa de estrutura em vez de texto bruto — parágrafos, títulos, tabelas —, a ferramenta PDF para Word reconstrói um documento editável.',
        'A extração acontece no seu navegador. Para contratos, prontuários médicos e tudo o mais que você não colaria em um site qualquer, o arquivo nunca sai do seu dispositivo.' ] },
    ],
  },
  'repair-pdf': {
    seoTitle: 'Reparar PDF online — conserte arquivos corrompidos | ShyPDF',
    sections: [
      { h: 'Por que PDFs quebrados muitas vezes podem ser salvos', p: [
        'Um PDF que “não abre” geralmente está danificado na estrutura, não vazio: o download foi interrompido, um servidor de e-mail o corrompeu, ou o programa que o gerou gravou um índice malfeito. Os dados das páginas ainda estão no arquivo — o leitor só não consegue chegar até eles. O ShyPDF entrega o arquivo ao qpdf, uma biblioteca de PDF confiável há décadas, que lê o que for recuperável e grava ao redor disso um arquivo novo e bem formado: novas tabelas de referências cruzadas, estrutura de objetos limpa, mesmo conteúdo.',
        'Se a cópia reparada for baixada, abra-a e confira as páginas. Se o qpdf informar que o arquivo não tem conserto, os bytes que faltam realmente se perderam — consiga uma cópia nova na fonte: baixe de novo, exporte de novo ou peça ao remetente que envie outra vez.' ] },
      { h: 'Repare sem entregar o arquivo a ninguém', p: [
        'Arquivos danificados costumam ser justamente os importantes — a fatura do arquivo morto, o contrato assinado de um backup antigo. A reconstrução roda no seu navegador via WebAssembly; tanto o arquivo quebrado quanto o reparado ficam no seu dispositivo.',
        'Um PDF que pede senha não está danificado, está criptografado. Desbloqueie-o antes com a ferramenta Desbloquear PDF (você precisa da senha) e depois repare, se ele continuar com problemas.' ] },
    ],
  },
};

export default content;
