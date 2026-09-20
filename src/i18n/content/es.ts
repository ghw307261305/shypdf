// Spanish tool-page SEO content. Structure must match content/en.ts; quoted labels match locales/es.ts.
import type { ToolContent } from './en';

const content: Record<string, ToolContent> = {
  'merge-pdf': {
    seoTitle: 'Unir PDF online gratis, sin subir archivos | ShyPDF',
    sections: [
      { h: 'Combina tus PDF sin enviarlos a ninguna parte', p: [
        'La mayoría de los sitios para unir PDF suben tus documentos a un servidor, los juntan allí y te devuelven el resultado. ShyPDF hace ese trabajo dentro de la pestaña de tu navegador. Los PDF que eliges se leen de tu disco a la memoria, se combinan en tu propio dispositivo y se guardan directamente en tu carpeta de descargas.',
        'Por eso encaja bien con los documentos que más se suelen unir: contratos firmados, extractos bancarios, formularios de impuestos, historiales médicos y documentos de identidad escaneados. Archivos que preferirías no entregar a un tercero solo para graparlos.' ] },
      { h: 'Cómo dejar el orden perfecto', p: [
        'Los archivos se unen en el orden en que aparecen las tarjetas en pantalla. Arrastra una tarjeta para moverla, usa los botones ‹ › en el móvil o haz clic en «Ordenar por nombre» si tus archivos están numerados (file2 queda antes que file10). ¿Solo necesitas algunas páginas de uno de los archivos? Pásalo primero por Dividir PDF y luego une las partes.',
        'Cada archivo de origen recibe un marcador de primer nivel en el documento final, de modo que quien lo lea puede saltar entre los archivos originales desde la barra lateral de su visor de PDF. Desmarca «Añadir un marcador por cada archivo» si prefieres un índice limpio.' ] },
    ],
    faq: [
      { q: '¿Unir mis PDF reduce su calidad?', a: 'No. Las páginas se copian al nuevo archivo tal como están: el texto sigue siendo texto y las imágenes no se vuelven a comprimir. Si el resultado pesa demasiado para enviarlo por correo, pásalo después por Comprimir PDF.' },
    ],
  },
  'split-pdf': {
    seoTitle: 'Dividir PDF online: extrae páginas sin subir nada | ShyPDF',
    sections: [
      { h: 'Extrae justo las páginas que necesitas', p: [
        'Escribe los rangos de páginas como lo harías en un cuadro de impresión: 1-3, 5, 8-10. Cada parte separada por comas se convierte en un PDF, así que ese ejemplo genera tres archivos: las páginas 1–3, la página 5 y las páginas 8–10. Para sacar un solo capítulo de un informe largo, escribe un único rango.',
        'Los otros modos resuelven los casos habituales sin escribir nada: «Un archivo por página» separa el documento en páginas sueltas, y las opciones de páginas impares y pares vienen muy bien para arreglar documentos digitalizados con un escáner de una sola cara.' ] },
      { h: 'Qué recibes al final', p: [
        'Cuando la división genera varios archivos, se agrupan en una sola descarga zip para que el navegador no te pregunte por cada uno; si son seis archivos o menos, también puedes descargarlos uno por uno. Las páginas se copian sin volver a comprimirse, así que la calidad es idéntica a la del original.',
        'La división se hace por completo en tu navegador. El documento nunca se sube, y eso importa cuando lo divides precisamente para compartir una página inofensiva de un archivo delicado.' ] },
    ],
  },
  'organize-pdf': {
    seoTitle: 'Organizar PDF: ordena, rota y elimina páginas sin subirlo | ShyPDF',
    sections: [
      { h: 'Reorganiza un PDF viendo sus páginas', p: [
        'Organizar PDF muestra todas las páginas como miniaturas. Arrástralas para cambiar el orden, haz clic en × para descartar las que no necesites (páginas en blanco del escáner, una portada, un anexo) y usa ↻ para rotar una sola página. En el móvil, los botones ‹ › mueven una página un paso cada vez.',
        'Cuando el orden te convenza, «Guardar PDF» crea un archivo nuevo solo con esas páginas y en ese orden. Tu archivo original no se modifica.' ] },
      { h: 'Privado por diseño', p: [
        'Las miniaturas se generan en tu propio dispositivo, igual que el PDF nuevo. No se sube nada, así que puedes ordenar con tranquilidad documentos con información personal o confidencial. Los documentos grandes también funcionan: las miniaturas se dibujan a medida que hacen falta, de modo que un archivo con cientos de páginas solo tarda unos segundos más en aparecer.' ] },
    ],
  },
  'add-page-numbers': {
    seoTitle: 'Añadir números de página a PDF gratis, sin subirlo | ShyPDF',
    sections: [
      { h: 'Una numeración pensada para documentos reales', p: [
        'Los informes y las tesis casi nunca empiezan a numerarse en la primera hoja. Ajusta «Empezar en la página» para saltarte la portada o el índice, y «Primer número» para decidir qué número lleva la primera página numerada: por ejemplo, empezar en la página 3 con el número 1. Elige cualquier esquina o el centro del borde superior o inferior, y ajusta el margen para que el número no pise los pies de página existentes.',
        'Entre los formatos hay números simples, «1 / 10», «- 1 -», «Página 1» y «Página 1 de 10», siempre en el idioma en el que estés navegando. El tamaño de fuente se puede ajustar entre 6 y 48 pt.' ] },
      { h: 'Sirve para cualquier PDF y no sale de tu dispositivo', p: [
        'Los números se dibujan encima de cada página, así que funciona tanto con documentos escaneados como con PDF exportados desde Word o Google Docs. El archivo se procesa en tu navegador y nunca se sube. ¿Vas a juntar varios documentos en uno? Únelos primero y numera después el resultado, para que la secuencia recorra todo el archivo.' ] },
    ],
  },
  'add-watermark': {
    seoTitle: 'Añadir marca de agua a PDF gratis, sin subirlo | ShyPDF',
    sections: [
      { h: 'Marca borradores, copias y documentos confidenciales', p: [
        'Escribe el texto que quieras (CONFIDENCIAL, BORRADOR, el nombre de un cliente, «Copia solo para solicitud de visa») y ShyPDF lo estampa en todas las páginas. Elige una sola marca centrada o repítela en mosaico por toda la página, y ajusta el tamaño, el ángulo, el color y la opacidad hasta que se vea sin tapar el contenido que hay debajo.',
        'Una marca de agua en mosaico, semitransparente y con el nombre del destinatario es una forma práctica de desalentar que una copia de tu documento de identidad o un contrato se reutilice donde no querías.' ] },
      { h: 'En cualquier idioma y sin subir nada', p: [
        'El texto se dibuja con las fuentes de tu dispositivo, así que escrituras como el chino, el japonés, el árabe o el cirílico funcionan igual de bien que el alfabeto latino. Y como todo el trabajo se hace en tu navegador, el documento que intentas proteger no se sube a ningún sitio en el proceso.' ] },
    ],
  },
  'jpg-to-pdf': {
    seoTitle: 'Convertir JPG a PDF gratis, sin subir archivos | ShyPDF',
    sections: [
      { h: 'Convierte fotos y escaneos en un PDF ordenado', p: [
        'Selecciona imágenes JPG, PNG o WebP (fotos de recibos hechas con el móvil, páginas escaneadas, capturas de pantalla) y ShyPDF coloca una imagen en cada página de un único PDF. Arrastra las tarjetas para definir el orden de las páginas antes de convertir.',
        'Elige «Igual que la imagen» para mantener cada imagen en su tamaño natural, o A4 / Letter para obtener páginas uniformes con la imagen ajustada a la página, que es lo que suele esperar un portal de trámites o una impresora. La orientación puede seguir la de cada imagen o forzarse a vertical u horizontal.' ] },
      { h: 'Tus fotos se quedan en tu dispositivo', p: [
        'Las fotos de documentos suelen contener justo lo que no deberías subir: firmas, direcciones, números de identificación. Aquí la conversión se hace en tu navegador y las imágenes nunca salen de tu dispositivo. Marca «Comprimir imágenes» si el PDF resultante tiene que ser lo bastante pequeño para enviarlo por correo.' ] },
    ],
    faq: [
      { q: '¿Puedo convertir fotos HEIC de un iPhone?', a: 'Directamente, no. Conviértelas primero a JPG: en un iPhone, enviarte la foto por correo a ti mismo suele hacerlo automáticamente; también puedes ir a Ajustes (o Configuración) → Cámara → Formatos y elegir la opción más compatible para que las fotos nuevas se guarden en JPG.' },
    ],
  },
  'pdf-to-jpg': {
    seoTitle: 'Convertir PDF a JPG gratis, sin subir archivos | ShyPDF',
    sections: [
      { h: 'Guarda las páginas de un PDF como imágenes', p: [
        'Cada página de tu PDF se convierte en una imagen JPG o PNG. Usa JPG para fotos y escaneos cuando importa el tamaño del archivo, y PNG para páginas con texto nítido, diagramas o capturas de pantalla en las que quieres bordes bien definidos. Deja vacío el campo de páginas para convertirlo todo, o escribe rangos como 1-3, 5 para exportar solo algunas páginas.',
        'Elige la resolución según el destino: 96 dpi para la web y las apps de mensajería, 150 dpi para uso general en pantalla y 300 dpi para imprimir. Las resoluciones más altas generan archivos más grandes y tardan más en procesarse.' ] },
      { h: 'Se genera en tu dispositivo', p: [
        'Las páginas las dibuja tu propio navegador con el mismo motor de código abierto (PDF.js) que usa el visor de PDF de Firefox. El PDF nunca se sube. Cuando conviertes más de una página, las imágenes se agrupan en una sola descarga zip.' ] },
    ],
  },
  'pdf-to-word': {
    seoTitle: 'Convertir PDF a Word gratis, sin subir archivos | ShyPDF',
    sections: [
      { h: 'Un documento editable, no una foto del documento', p: [
        'ShyPDF lee el texto de tu PDF junto con su posición, su fuente y su tamaño, y con eso reconstruye contenido real de Word: párrafos continuos que puedes reescribir, títulos que aparecen en el panel de navegación de Word, negrita y cursiva, alineación, sangrías, tablas sencillas e imágenes. El tamaño de página y los márgenes se mantienen, y cada página del PDF empieza en una página nueva en Word.',
        'Un PDF no guarda párrafos ni tablas, solo dónde se dibuja cada carácter, así que la conversión es una reconstrucción bien fundamentada. Funciona mejor con documentos que salieron de un procesador de textos: cartas, contratos, informes, trabajos y currículums. Los diseños en varias columnas se leen columna por columna. Las páginas muy diseñadas, los formularios y el texto colocado sobre imágenes quedan simplificados.' ] },
      { h: 'El archivo que conviertes suele ser justo el delicado', p: [
        'La gente convierte PDF a Word para editar contratos, completar datos en cartas oficiales o actualizar un currículum. Con la mayoría de los convertidores en línea, eso implica subir el documento a una empresa de la que no sabes nada. Aquí la conversión se hace dentro de la pestaña de tu navegador y el PDF nunca sale de tu dispositivo.',
        'Si el resultado indica que tu PDF no tiene texto seleccionable, es un escaneo. Usa OCR PDF para reconocer primero el texto y luego convierte el PDF con búsqueda.' ] },
    ],
    faq: [
      { q: '¿Qué aplicaciones pueden abrir el resultado?', a: 'Es un archivo .docx estándar, así que lo abren Microsoft Word, Google Docs, LibreOffice Writer, Apple Pages y WPS Office.' },
    ],
  },
  'word-to-pdf': {
    seoTitle: 'Convertir Word a PDF gratis, sin subir archivos | ShyPDF',
    sections: [
      { h: 'Un PDF de verdad, creado en tu propio dispositivo', p: [
        'ShyPDF lee el archivo .docx, compone él mismo cada página y crea un PDF con texto seleccionable, en el que se puede buscar, y con las fuentes incrustadas: no una captura de pantalla del documento. Se conservan los estilos, los títulos, las listas con viñetas y numeradas, las tablas con bordes y sombreado, las imágenes, los hipervínculos, los encabezados, los pies de página y los números de página, con el tamaño de página y los márgenes definidos en el documento.',
        'No se envía nada a ningún servidor. Eso importa con los documentos que se suelen pasar a PDF antes de enviarlos: ofertas, facturas, contratos, currículums y cartas de presentación.' ] },
      { h: 'Por qué los saltos de página coinciden con los de Word', p: [
        'Los documentos de Word suelen indicar fuentes que solo vienen con Microsoft Office. ShyPDF las sustituye por fuentes de código abierto diseñadas para tener exactamente los mismos anchos de carácter (Carlito por Calibri, Arimo por Arial, Tinos por Times New Roman, Cousine por Courier New), así que las líneas se cortan en las mismas palabras y las páginas saltan casi en los mismos sitios. La forma de las letras cambia un poco; la maquetación, no. El texto en chino, japonés y coreano usa Noto Sans.',
        'Algunas cosas todavía no se admiten: las secciones en varias columnas, el texto que rodea imágenes flotantes, los gráficos, los SmartArt y las escrituras de derecha a izquierda. El texto de los cuadros de texto se conserva, pero se coloca en el flujo normal de la página. Si tu documento depende de esos elementos, exportarlo a PDF desde el propio Word dará un resultado más fiel.' ] },
    ],
    faq: [
      { q: '¿Se incluyen los cambios con seguimiento y los comentarios?', a: 'El PDF muestra el documento con todos los cambios con seguimiento aceptados: el texto insertado se incluye y el eliminado, no. Los comentarios se omiten.' },
    ],
  },
  'compress-pdf': {
    seoTitle: 'Comprimir PDF online gratis, sin subir archivos | ShyPDF',
    sections: [
      { h: 'Dos modos, porque los PDF pesan por motivos distintos', p: [
        'El modo Ligero reconstruye la estructura interna del archivo y elimina los datos redundantes. El texto sigue siendo seleccionable y se puede buscar, y no cambia nada a la vista; el ahorro habitual es de entre un 5 y un 30 %. Es lo primero que conviene probar con documentos exportados desde Word, Google Docs o herramientas de diseño.',
        'El modo Fuerte convierte cada página en una imagen JPEG y crea un PDF nuevo a partir de esas imágenes. Es muy eficaz con documentos escaneados y archivos con muchas fotos (a menudo quedan más de un 50 % más pequeños), pero el texto ya no se puede seleccionar, así que conserva el original. Elige 72, 110 o 150 dpi según si el resultado solo tiene que leerse en pantalla o también imprimirse.' ] },
      { h: 'Sinceros con el resultado', p: [
        'ShyPDF te muestra el tamaño de antes y el de después. Si la compresión no fuera a reducir el archivo, algo que pasa con los PDF que ya están optimizados, te devuelve el original en lugar de una copia «comprimida» que pese más.',
        'Todo se hace en tu navegador y el archivo nunca se sube, así que puedes reducir un extracto bancario o un contrato para que quepa en el límite de adjuntos del correo sin compartirlo con un servicio de compresión.' ] },
    ],
    faq: [
      { q: '¿Cuánto tiene que pesar un PDF para enviarlo por correo?', a: 'Gmail acepta adjuntos de hasta 25 MB y Outlook.com de hasta 20 MB, pero muchos servidores de correo de empresa ponen límites más bajos, con frecuencia de 10 MB. Si el modo Fuerte a 110 dpi sigue siendo demasiado, prueba con 72 dpi, o divide el documento y envíalo por partes.' },
    ],
  },
  'ocr-pdf': {
    seoTitle: 'OCR PDF: busca texto en PDF escaneados sin subirlos | ShyPDF',
    sections: [
      { h: 'Convierte un escaneo en un PDF en el que puedes buscar', p: [
        'Un PDF escaneado es una pila de imágenes: no puedes buscar en él, seleccionar una frase ni copiar un número. El OCR (reconocimiento óptico de caracteres) lee el texto de esas imágenes. ShyPDF coloca las palabras reconocidas como una capa invisible justo encima de las escaneadas, de modo que Ctrl+F, la selección de texto y copiar y pegar funcionan mientras la página se ve exactamente igual que antes.',
        'Las páginas originales no se vuelven a comprimir ni a dibujar, así que no se pierde calidad y el archivo solo crece lo que ocupa el texto. Si solo quieres las palabras, elige «Texto sin formato (.txt)». De forma predeterminada se omiten las páginas que ya contienen texto seleccionable, lo que acelera los documentos mixtos.' ] },
      { h: 'Cómo obtener buenos resultados', p: [
        'Elige el idioma en el que está escrito el documento: es el factor que más influye en la precisión. Están disponibles inglés, español, portugués, francés, alemán, italiano, japonés y chino simplificado, y «Reconocer también inglés» ayuda con los documentos que mezclan términos en inglés con otro idioma.',
        'El reconocimiento se hace en tu navegador con Tesseract, un motor de OCR de código abierto con una larga trayectoria, compilado a WebAssembly. Calcula unos segundos por página, según tu dispositivo. Los escaneos de extractos bancarios, documentos de identidad, historiales médicos y contratos firmados son justo el tipo de archivo que no debería subirse a un servicio de OCR; aquí nunca salen de tu dispositivo.' ] },
    ],
    faq: [
      { q: '¿Puedo aplicar OCR a una foto o a un JPG?', a: 'Sí, en dos pasos: convierte las imágenes en un PDF con JPG a PDF y luego pasa ese PDF por OCR PDF.' },
    ],
  },
  'unlock-pdf': {
    seoTitle: 'Desbloquear PDF: quita una contraseña que conoces | ShyPDF',
    sections: [
      { h: 'Para tus propios documentos, cuando la contraseña estorba', p: [
        'Los bancos, los servicios de nómina y los portales de la administración suelen enviar los extractos como PDF protegidos con contraseña. Tiene sentido durante el envío y es una molestia después: hay que escribir la contraseña cada vez y no puedes unir el archivo con otros. Escribe la contraseña una sola vez y ShyPDF guarda una copia que se abre con normalidad.',
        'Algunos PDF se abren sin contraseña pero impiden imprimir, copiar o editar. Si un documento así es tuyo, o su propietario te ha pedido que trabajes en él, ShyPDF puede guardar una copia sin esas restricciones. Se te pedirá que confirmes que tienes derecho a hacerlo.' ] },
      { h: 'Lo que esta herramienta no hace', p: [
        'ShyPDF no adivina ni recupera contraseñas. Si un archivo pide una contraseña para abrirse y no la tienes, esta herramienta no puede ayudarte. Está pensada para quitar la protección de documentos que tienes derecho a modificar, no para quitársela a obras ajenas.',
        'La contraseña que escribes y el propio documento se quedan en tu dispositivo: el descifrado lo hace en tu navegador qpdf, una biblioteca PDF de código abierto con una larga trayectoria, compilada a WebAssembly. No se sube nada.' ] },
    ],
  },
  'protect-pdf': {
    seoTitle: 'Proteger PDF con contraseña: AES-256, sin subirlo | ShyPDF',
    sections: [
      { h: 'Cifra un PDF antes de enviarlo', p: [
        'Pon una contraseña de apertura y el documento se cifra con AES-256; nadie puede leerlo sin la contraseña, use el lector de PDF que use. Comparte la contraseña por un canal distinto al del archivo: por ejemplo, envía el PDF por correo y la contraseña por mensaje de texto.',
        'También puedes restringir la impresión, la copia o la edición. Ten claro lo que eso significa: las restricciones de permisos las hacen cumplir los lectores de PDF, no el cifrado del contenido, así que tómalas como una declaración clara de intenciones y no como una protección fuerte. Para cualquier cosa delicada, usa una contraseña de apertura.' ] },
      { h: 'La contraseña nunca sale de tu navegador', p: [
        'Con un servicio basado en subidas, tanto tu documento confidencial como la contraseña que lo protege viajan al servidor de otra persona. Aquí el cifrado lo hace en tu dispositivo qpdf, una biblioteca PDF de código abierto compilada a WebAssembly, y ni el archivo ni la contraseña se envían a ninguna parte.',
        'No hay forma de recuperar una contraseña olvidada: ni tú ni nosotros, porque nunca la vemos. Guárdala en un gestor de contraseñas.' ] },
    ],
    faq: [
      { q: '¿Cómo es una buena contraseña para un PDF?', a: 'Lo que más importa es la longitud. Cuatro o cinco palabras al azar, o 14 caracteres aleatorios o más generados por un gestor de contraseñas, son mucho más fuertes que una contraseña corta con símbolos. Evita las fechas de nacimiento y los números de identificación, que son lo primero que prueba un atacante.' },
    ],
  },
  'sign-pdf': {
    seoTitle: 'Firmar PDF online gratis, sin subirlo y sin cuenta | ShyPDF',
    sections: [
      { h: 'Firma sin imprimir, sin escanear y sin registrarte', p: [
        'Abre el PDF, crea tu firma y arrástrala hasta la línea de firma. Puedes dibujarla con el ratón, el dedo o un lápiz óptico, escribir tu nombre con un estilo de letra manuscrita o subir una foto de tu firma sobre papel blanco: ShyPDF quita el fondo del papel para que solo quede la tinta. Usa las flechas de página para llegar a la página correcta, arrastra el tirador para cambiar el tamaño y marca «Ponerla en todas las páginas» cuando un documento necesite tus iniciales en cada hoja.',
        'La firma se dibuja dentro de la propia página, así que aparece en todos los lectores de PDF y al imprimir. Tu archivo original no se modifica; descargas una copia firmada.' ] },
      { h: 'Tu firma no es algo que convenga subir', p: [
        'Una firma junto a un contrato firmado es de lo más delicado que hay en materia de documentos. La mayoría de los sitios de firma electrónica guardan ambas cosas en sus servidores, y muchos exigen crear una cuenta. ShyPDF hace todo el trabajo en tu navegador: el PDF y la firma se quedan en tu dispositivo, no se guarda nada entre una visita y otra, y no hay cuentas.',
        'Se trata de una firma electrónica simple, el equivalente a firmar una copia impresa, y no de una firma digital basada en certificado. Se acepta de forma generalizada para el papeleo cotidiano, pero algunos documentos exigen legalmente algo más; si tienes dudas, pregunta al destinatario. Para evitar que el archivo firmado se edite después, pásalo por Proteger PDF y restringe la edición.' ] },
    ],
  },
  'crop-pdf': {
    seoTitle: 'Recortar PDF online: quita márgenes sin subirlo | ShyPDF',
    sections: [
      { h: 'Recorta un PDF y quédate con lo que importa', p: [
        'Arrastra un recuadro sobre el área que quieres conservar y todo lo que queda fuera se recorta, en todas las páginas o solo en la actual. Los márgenes anchos del escáner, los bordes con agujeros de archivador, la mitad vacía de un documento de diapositivas: desaparecen en un par de segundos, con una vista previa en vivo para que veas exactamente por dónde pasa el corte.',
        'El recorte ajusta el área de recorte (crop box) de cada página, el dato que todos los lectores de PDF usan para decidir qué mostrar e imprimir. El contenido de la página no se vuelve a renderizar ni a comprimir, así que el texto sigue siendo seleccionable y las imágenes conservan su nitidez.' ] },
      { h: 'Qué es el recorte y qué no es', p: [
        'Como solo cambia el área visible, la página completa sigue guardada dentro del archivo, y las herramientas que restablecen el área de recorte pueden recuperar las partes recortadas. Por eso recortar es la herramienta adecuada para ordenar la presentación, y la equivocada para ocultar información confidencial: para eso, tapa el contenido con un recuadro negro en Editar PDF, que sí lo pinta encima.',
        'Como todas las herramientas de ShyPDF, el recorte se hace en tu navegador; el archivo nunca se sube.' ] },
    ],
  },
  'delete-pages': {
    seoTitle: 'Eliminar páginas de un PDF online, sin subirlo | ShyPDF',
    sections: [
      { h: 'Quita páginas viéndolas, o por su número', p: [
        'Cada página aparece como una miniatura. Haz clic en × sobre las páginas en blanco del escáner, la portada que no necesitas o los escaneos duplicados, y guarda lo que queda como un PDF nuevo. Si ya sabes los números, escríbelos directamente: 2, 5-7 elimina la página 2 y las páginas 5 a 7 de una sola vez.',
        'Las páginas restantes se copian exactamente como están, sin volver a comprimirse, así que el archivo nuevo no pierde nada de calidad. Tu PDF original no se toca; descargas una copia más corta.' ] },
      { h: 'El motivo habitual: enviar solo lo imprescindible', p: [
        'Rara vez se eliminan páginas por gusto: el archivo que se recorta suele ser un extracto bancario, un contrato o un lote de escaneos camino de la bandeja de entrada de otra persona. Hacer la limpieza en tu navegador significa que el documento completo, incluidas las páginas que estás quitando, nunca viaja a un servidor.' ] },
    ],
  },
  'extract-pages': {
    seoTitle: 'Extraer páginas de un PDF a un archivo nuevo | ShyPDF',
    sections: [
      { h: 'Un PDF nuevo hecho solo con las páginas que eliges', p: [
        'Escribe los rangos como los acepta un cuadro de impresión (1-3, 5, 8-10) y las páginas seleccionadas se copian, en el orden del documento, a un único PDF nuevo. Es la forma más rápida de sacar un capítulo de un informe, un anexo de un expediente o las dos páginas que de verdad necesita un cliente de un escaneo de cuarenta.',
        'Las páginas se copian sin volver a comprimirse, así que el extracto es idéntico al original, píxel a píxel. El archivo de origen se queda como está.' ] },
      { h: '¿Extraer o Dividir?', p: [
        'Responden a preguntas distintas. Extraer páginas de PDF crea un solo archivo con todo lo que seleccionas: lo adecuado cuando el resultado debe viajar como un único adjunto. Dividir PDF crea un archivo separado por cada rango: lo adecuado cuando estás troceando un documento. Si extraes páginas y luego las quieres en otro orden, pasa el resultado por Organizar PDF.' ] },
    ],
  },
  'edit-pdf': {
    seoTitle: 'Editar PDF online: texto y resaltados, sin subirlo | ShyPDF',
    sections: [
      { h: 'Las ediciones que de verdad hacen falta, sin una suite de edición', p: [
        'La mayoría de los momentos de «editar un PDF» son pequeños: añadir una línea de texto donde el formulario espera letra manuscrita, resaltar la cláusula que importa, tapar un número de teléfono antiguo con un recuadro blanco y escribir el nuevo encima. ShyPDF pone esos cuatro gestos (texto, resaltado, recuadro blanco, recuadro negro) a un clic de distancia. Coloca un elemento en la página, arrástralo hasta su posición y cámbiale el tamaño con el tirador de la esquina.',
        'El texto se dibuja con las fuentes de tu dispositivo, así que funciona el chino, el japonés, el árabe o cualquier otra escritura que tu sistema pueda mostrar. Cada página del PDF conserva su calidad; tus ediciones se dibujan encima y pasan a formar parte permanente de la copia guardada.' ] },
      { h: 'Editar un PDF no debería implicar subirlo', p: [
        'Los PDF que se editan son contratos, solicitudes, extractos y documentos de identidad: justo los primeros de la lista de lo que no conviene subir. Aquí toda la edición ocurre en la pestaña de tu navegador; el archivo nunca sale de tu dispositivo y el original de tu disco queda intacto.',
        'Un PDF guarda caracteres dibujados, no párrafos editables, así que ninguna herramienta del navegador puede reescribir el texto existente en su sitio. Para reescribir un documento, conviértelo con PDF a Word, edítalo con calma y vuelve a convertirlo con Word a PDF.' ] },
    ],
  },
  'fill-pdf': {
    seoTitle: 'Rellenar formulario PDF online, sin subirlo | ShyPDF',
    sections: [
      { h: 'Escribe en campos de formulario de verdad', p: [
        'Si tu PDF tiene campos de formulario reales (de los que muestran un cursor al hacer clic), ShyPDF lista todos los campos de texto, casillas, botones de opción y desplegables, en el orden del documento, listos para rellenarlos con el teclado. Al lado hay una vista previa de la página para que compruebes el resultado sobre la marcha.',
        'Al guardar, las respuestas se escriben en el propio formulario. Marca «Aplanar el formulario» y se convierten en contenido fijo de la página: después nada se puede editar ni borrar por accidente, y el formulario se ve idéntico en todas partes. La opción más segura cuando el siguiente destino es la bandeja de entrada de alguien.' ] },
      { h: 'Los formularios son justo los archivos que deben quedarse en tu equipo', p: [
        'Un formulario relleno está lleno de datos personales: nombres, direcciones, números de identificación, cifras de sueldo. Rellenarlo en tu navegador significa que ni el formulario en blanco ni tus respuestas llegan nunca a un servidor.',
        'Si en otras aplicaciones no pasa nada al hacer clic en los campos, el PDF probablemente es un formulario escaneado o «impreso» sin campos reales. ShyPDF te lo dirá: usa Editar PDF para escribir encima de un formulario así, y Firmar PDF para añadir la firma.' ] },
    ],
  },
  'png-to-pdf': {
    seoTitle: 'Convertir PNG a PDF gratis, sin subir archivos | ShyPDF',
    sections: [
      { h: 'Capturas de pantalla y gráficos en un PDF limpio', p: [
        'PNG es el formato de las capturas de pantalla, los diagramas, los gráficos y las diapositivas exportadas: imágenes con bordes definidos y colores exactos. ShyPDF coloca cada imagen en su propia página del PDF, en el orden que definas arrastrando las tarjetas. Mantén cada página con el tamaño natural de su imagen, o elige A4 / Letter para obtener páginas uniformes que se imprimen de forma predecible.',
        'Los PNG se insertan sin recomprimir, así que una captura de pantalla dentro del PDF es, píxel a píxel, la captura que hiciste. Las zonas transparentes quedan sobre el fondo blanco de la página. Puedes mezclar imágenes JPG y WebP sin problema.' ] },
      { h: 'La conversión se hace en tu dispositivo', p: [
        'Las capturas de pantalla tienen la costumbre de contener más de lo previsto: nombres, números de cuenta, medio hilo de correos. La conversión se hace por completo en tu navegador, así que las imágenes nunca salen de tu dispositivo. Si el resultado tiene que ser lo bastante pequeño para el correo, marca «Comprimir imágenes».' ] },
    ],
  },
  'pdf-to-png': {
    seoTitle: 'Convertir PDF a PNG gratis, sin subir archivos | ShyPDF',
    sections: [
      { h: 'Imágenes sin pérdida de cada página', p: [
        'Cada página del PDF se convierte en un PNG: el formato adecuado cuando la página contiene texto, tablas, diagramas o interfaces, porque los bordes quedan nítidos, los colores exactos y no aparecen los artefactos de compresión que el JPG deja alrededor de las letras. Convierte el archivo entero o solo las páginas que indiques, a 96, 150 o 300 dpi según el destino de la imagen.',
        'Si hay varias páginas, llegan agrupadas en un solo zip. ¿Necesitas archivos más pequeños para páginas con muchas fotos? La opción JPG está a un clic, en esta misma herramienta.' ] },
      { h: 'Las genera tu propio navegador', p: [
        'Las páginas se dibujan en tu dispositivo con PDF.js, el motor que lleva dentro Firefox, y el PDF nunca se sube. La diapositiva que conviertes en PNG para una presentación, o la página de un extracto que necesitas como imagen para un portal de trámites, se queda en tu dispositivo durante todo el proceso.' ] },
    ],
  },
  'pdf-to-text': {
    seoTitle: 'PDF a texto: extrae el texto online, sin subirlo | ShyPDF',
    sections: [
      { h: 'Todas las palabras, nada del formato', p: [
        'ShyPDF lee la capa de texto del PDF y la escribe en un archivo .txt sin formato: los saltos de línea se conservan, las páginas se marcan si quieres y todo lo demás se descarta. Es justo lo que necesitas para pasar un documento a un script, a una herramienta de traducción o a un modelo de IA, para contar palabras o para pegarlo donde el formato del PDF solo estorba.',
        'Limita la extracción a ciertas páginas con rangos como 1-3, 5. Las marcas de salto de página facilitan rastrear de qué página salió cada línea.' ] },
      { h: 'Cuando la salida llega vacía', p: [
        'Un PDF escaneado no tiene capa de texto (son fotografías de texto), así que no hay nada que extraer. Pasa el escaneo por OCR PDF: reconoce las palabras en las imágenes de las páginas y puede generar texto sin formato directamente. Y cuando necesitas estructura en lugar de texto en bruto (párrafos, títulos, tablas), PDF a Word reconstruye un documento editable.',
        'La extracción se hace en tu navegador. Con contratos, historiales médicos y todo lo que no pegarías en una web cualquiera, el archivo nunca sale de tu dispositivo.' ] },
    ],
  },
  'repair-pdf': {
    seoTitle: 'Reparar PDF online: arregla archivos dañados | ShyPDF',
    sections: [
      { h: 'Por qué muchos PDF rotos tienen arreglo', p: [
        'Un PDF que «no se abre» suele estar dañado en su estructura, no vacío: la descarga se cortó, una pasarela de correo lo estropeó o el programa que lo creó escribió un índice descuidado. Los datos de las páginas siguen en el archivo; el lector simplemente no encuentra el camino hasta ellos. ShyPDF le entrega el archivo a qpdf, una biblioteca PDF con décadas de confianza, que lee todo lo recuperable y escribe alrededor un archivo nuevo y bien formado: tablas de referencias cruzadas nuevas, estructura de objetos limpia, el mismo contenido.',
        'Si la copia reparada se descarga, ábrela y revisa las páginas. Si qpdf indica que el archivo no tiene arreglo, los bytes que faltan se han perdido de verdad: consigue una copia nueva del origen, descárgalo otra vez, vuelve a exportarlo o pide que te lo envíen de nuevo.' ] },
      { h: 'Repara sin entregar el archivo', p: [
        'Los archivos dañados suelen ser los importantes: la factura del archivo histórico, el contrato firmado de una copia de seguridad antigua. La reconstrucción se ejecuta en tu navegador mediante WebAssembly; tanto el archivo roto como el reparado se quedan en tu dispositivo.',
        'Un PDF que pide contraseña no está dañado: está cifrado. Desbloquéalo primero con Desbloquear PDF (necesitas la contraseña) y repáralo después si sigue dando problemas.' ] },
    ],
  },
};

export default content;
