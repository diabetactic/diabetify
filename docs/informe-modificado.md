[LOGO_PLACEHOLDER]

**"*Diabetactic:* Desarrollando el Futuro en Sistemas de Gestión para el Seguimiento Pediátrico de Pacientes con Diabetes Tipo 1"**

**Integrantes**

**Crespo, Julián Andres** - 100490

jcrespo@fi.uba.ar

**Sabella Rosa, Cristóbal** - 106440

csabella@fi.uba.ar

**Stroia, Lautaro Ernesto** - 100901

lstroia@fi.uba.ar

**Tutor**: Gustavo Carolo - gcarolo@fi.uba.ar

**Cotutores**:

● Fernando Sanz - fsanz@garrahan.gov.ar

● Hernan Merlino - hmerlino@fi.uba.ar

# Resumen

El presente trabajo propone el desarrollo de una aplicación móvil (con su portal de escritorio *backoffice*) para facilitar el monitoreo y control de la diabetes tipo 1 en pacientes pediátricos. El objetivo es agilizar las consultas médicas, brindando a los profesionales acceso rápido a los datos relevantes de los pacientes y permitiendo ajustes precisos en la dosis de insulina.
La aplicación contará con funcionalidades clave como el monitoreo de valores, integración con dispositivos, una calculadora de bolo y acceso para control médico.
El proyecto se desarrolló utilizando la metodología ágil Kanban y se realizaron pruebas exhaustivas para validar la aplicación. Los principales entregables incluyen la aplicación móvil para niños, el portal para médicos, el backend y servidores necesarios, así como la documentación completa.

# Palabras clave

Diabetes Infantil, Diabetes Mellitus Tipo 1, Sistema de Gestión, Seguimiento de Pacientes, Tasa de Adhesión, Consultas Médicas, Aplicación Móvil, Aplicación de Escritorio.

# Abstract

# Keywords

Pediatric Diabetes, Type 1 Diabetes Mellitus, Management System, Patient Monitoring, Adherence Rate, Medical Consultations, Mobile Application, Desktop Application.

# Introducción

El diabetes mellitus es una familia de trastornos metabólicos que se caracterizan por una hiperglucemia crónica (exceso de glucosa en sangre a largo plazo) debido a defectos en la secreción y/o accionar de insulina (hormona que se encarga de disminuir la glucemia).¹ Se trata de una condición que, de no tratarse (mediante controles y administración de insulina), presenta altas tasas de mortalidad.
Más puntualmente, este trabajo se centrará en el llamado diabetes mellitus tipo 1. Éste ocurre por la destrucción autoinmune de células pancreáticas (órgano que segrega insulina) en individuos genéticamente predispuestos.
Una característica que poseé esta condición es que afecta principalmente al rango etario de niños y adolescentes, como se puede apreciar en el gráfico siguiente:

| [GRAFICO_EDAD_DEBUT_PLACEHOLDER] |
| ----- |
| Figura 1: edad de debut de diabetes mellitus tipo 1, en la República Argentina.   |

Este rango etario representa un problema, ya que para el tratamiento es necesario realizar un monitoreo constante de distintos valores, como los niveles de glucosa en sangre, para poder calcular cuándo y cuánta insulina administrar. Estos cálculos deben realizarse contínuamente, ya que varían persona a persona y, a su vez, varían a lo largo del tiempo según la realización de actividad física y/o alimentación, entre otros factores.
Para lograr un seguimiento exitoso de pacientes con diabetes, es necesario mantener contacto con un equipo médico para la realización de consultas. Estas consultas médicas, realizadas en un entorno hospitalario, se pueden clasificar en dos grupos:

* Consultas programadas: se planifican con anticipación en un día y horario acordado. Permiten planificación y estimación de la carga de pacientes para el hospital.
* Consultas espontáneas: el paciente acude al hospital sin cita a la espera de ser atendido. Son de naturaleza aleatoria, y presentan una carga de pacientes imposible de saber con exactitud.

Para el seguimiento de diabetes, ambos tipos de consultas son comunes. Más puntualmente, son usuales las consultas espontáneas con el fin de ajustar la dosis de insulina, según cambios en las mediciones de glucemia del paciente. Estas consultas suelen ser demandantes en tiempo, ya que implican tareas manuales por parte del profesional médico, como la lectura de datos impresos o descarga desde dispositivos de seguimiento utilizados por pacientes, que suelen ser de diferentes productores y encontrarse en diferentes nubes (cloud storages). El hospital Garrahan tiene alrededor de 600 pacientes en seguimiento, traduciéndose en 10 a 15 consultas por día.
En el presente trabajo, se propone el diseño y desarrollo de una aplicación que facilite el seguimiento de distintos valores y mediciones en pacientes insulinodependientes con diabetes tipo I. El objetivo es agilizar y simplificar las consultas médicas relacionadas con la lectura y el cálculo de los distintos parámetros requeridos para determinar el dosaje de insulina necesario. Para lograr esto, será necesaria una aplicación que logre una fuerte adherencia por parte de pacientes.

# Estado del arte

# Problema detectado y/o faltante

La cuestión principal que necesita abordarse es alivianar el tiempo y carga del plantel médico al que se le pueda ofrecer el servicio (en este caso, el plantel del Garrahan). Poder agilizar la revisión de mediciones durante las consultas o, incluso, lograr que una consulta espontánea sea evitada mediante intercambio de información necesaria para evitar emergencias. Surge entonces la necesidad de alguna manera de recopilar la información y hacerla llegar de manera sencilla e integral (unificando las múltiples nubes y dispositivos); surgiendo como público objetivo al plantel médico que sigue el tratamiento.
A la hora de conllevar el tratamiento crónico de diabetes mellitus tipo 1 (con fuertes consecuencias en caso de no respetarlo), es imperativo que los pacientes tengan una alta tasa de adherencia. Esto es complicado cuando se trata de un grupo etario potencialmente poco prudente (como lo son los niños y adolescentes), por lo que se buscará que se tengan las mayores facilidades posibles a la hora de realizarlo. Es por eso que surge la necesidad de que la aplicación que se desarrolle esté diseñada con un público objetivo jóven en mente, que pueda mantener una alta tasa de adhesión, y cuya información sea fácilmente accesible por parte del plantel médico (como se mencionó previamente).

# Solución implementada

Se implementó una aplicación de escritorio y móvil integral diseñada específicamente para facilitar el monitoreo y control de la diabetes tipo 1 en pacientes pediátricos. Esta aplicación tiene como objetivo principal agilizar el proceso de consulta médica al proporcionar a los médicos acceso rápido y fácil a los datos relevantes sobre la salud de los pacientes, permitiéndoles realizar ajustes precisos en la dosis de insulina y ofrecer recomendaciones personalizadas.
La aplicación contiene características clave que atienden las necesidades específicas de los pacientes y los médicos:

1. **Monitoreo de valores relevantes**: La aplicación permite a los pacientes registrar y monitorear varios valores cruciales para el control de la diabetes tipo 1, incluyendo niveles de glucosa en sangre, dosis de insulina administrada, ingestión de carbohidratos, niveles de actividad física o cualquier otro parámetro relevante. Para aquellos pacientes que utilizan dispositivos de monitoreo continuo de glucosa o bombas de insulina, la aplicación se integra con las APIs correspondientes para recopilar datos de mediciones. Además, se proporciona la opción de ingresar mediciones manuales para aquellos pacientes que realicen seguimiento de manera tradicional (a falta de dispositivos).
2. **Calculadora de Bolo**: La aplicación incluye herramientas para calcular la dosis de insulina necesaria para cubrir los carbohidratos consumidos en una comida. Basándose en la relación insulina a carbohidratos (I:C) y el factor de corrección o sensibilidad a la insulina (ISF) de cada paciente, la aplicación ofrece recomendaciones personalizadas para ayudar a mantener los niveles de glucosa en sangre dentro del rango objetivo.
3. **Interfaz amigable e inclusiva**: Conscientes de la diversidad de usuarios y posibles limitaciones de accesibilidad, se diseñó una interfaz intuitiva y amigable que es fácil de usar tanto para los pacientes pediátricos como para los profesionales médicos.
4. **Acceso remoto**: La aplicación permite a los médicos acceder a los datos de los pacientes de forma remota, lo que facilitará la realización de consultas y el seguimiento continuo de la salud de los pacientes. Además, se implementó una función de acceso de emergencia que permitirá a los médicos y personal médico autorizado acceder a los datos de los pacientes en casos de emergencia médica, garantizando una atención rápida y eficiente cuando sea necesario.
5. **Personalización y Educación**: La aplicación ofrecerá funciones de personalización para adaptarse a las necesidades individuales de cada paciente, como recordatorios personalizados para mediciones de glucosa, dosis de insulina y seguimiento de la ingesta de alimentos. Además, se proporcionarán recursos educativos integrados, como consejos de estilo de vida saludable, guías de alimentación y videos instructivos, para empoderar a los pacientes y sus familias en la gestión efectiva de la diabetes.

## 5.1 Interfaz de Usuario Optimizada para Pacientes Pediátricos

Como parte fundamental de la estrategia para aumentar la tasa de adhesión en el público objetivo (niños y adolescentes), se implementó una interfaz de usuario especialmente diseñada que considera las necesidades cognitivas y emocionales de los pacientes pediátricos.

### Pantalla de Bienvenida

La pantalla de bienvenida representa el primer punto de contacto del usuario con la aplicación, siendo crucial para establecer una experiencia positiva desde el inicio. El diseño implementado se muestra en la siguiente captura:

[WELCOME_SCREEN_SCREENSHOT_PLACEHOLDER]

**Características principales del diseño:**

- **Ilustración personalizada**: Se utilizaron personajes superhéroes con diversidad étnica que representan empoderamiento y normalización de la condición médica, reduciendo la ansiedad asociada con el manejo de la diabetes.

- **Mensaje motivacional**: El texto "Tu compañero amigable para controlar la diabetes con una sonrisa" utiliza un lenguaje positivo y cercano, alejándose de la terminología médica intimidante.

- **Jerarquía visual clara**:
  - Título principal destacado (24px): "¡Bienvenido a Diabetactic!"
  - Subtítulo descriptivo (14px) con tono neutro
  - Botones de acción con estados visuales diferenciados

- **Elementos interactivos**:
  - CTA primario con elemento de gamificación: "¿Eres más fuerte que la diabetes?"
  - Botón de acción principal: "EMPEZAR" con verbo simple y directo
  - Opción secundaria para usuarios recurrentes: "INICIAR SESIÓN"

- **Adaptación a contextos de uso**: La interfaz mantiene legibilidad y elementos visuales tanto en modo claro como en modo oscuro, considerando diferentes condiciones de luminosidad.

**Fundamento del diseño:**

Esta interfaz responde directamente al objetivo de mejorar la tasa de adhesión (actualmente entre 45-60% en población pediátrica) mediante:

1. **Reducción de intimidación**: Los superhéroes normalizan el uso de la aplicación como "herramienta de poder" en lugar de "recordatorio de enfermedad"
2. **Claridad de propósito**: El mensaje descriptivo establece expectativas claras sin tecnicismos médicos
3. **Accesibilidad inmediata**: Flujo de onboarding simplificado con máximo 2 pasos para la primera interacción

**Métricas de éxito esperadas:**
- Tasa de abandono en onboarding: <15% (benchmark industria: 25%)
- Tiempo hasta primera interacción significativa: <60 segundos
- Net Promoter Score (NPS) en segmento 6-12 años: >40

# Metodología aplicada

## Enfoque Ágil

Se utilizó la metodología ágil Kanban, que permite una gestión flexible y eficiente del desarrollo del proyecto. Esta metodología facilita la adaptación a cambios y la mejora continua a través de ciclos cortos de trabajo.

## Planificación y Priorización

Se llevaron a cabo sesiones de planificación para definir las características y funcionalidades esenciales de la aplicación. Se priorizaron tareas según su impacto en el usuario final y la viabilidad técnica.

## Desarrollo Iterativo

El desarrollo se realizó en iteraciones, lo que permitió implementar y probar funcionalidades de manera incremental. Cada iteración incluyó la revisión de los avances con el equipo del hospital, asegurando que el desarrollo se alineara con los objetivos del proyecto.

## Integración Continua

Se implementaron prácticas de integración continua para facilitar la detección temprana de errores y asegurar la calidad del código. Esto incluyó pruebas automáticas y revisiones de código regulares.

## Validación y Pruebas

Se llevaron a cabo pruebas exhaustivas en cada fase del desarrollo. Esto incluyó pruebas unitarias, pruebas de integración y pruebas de usabilidad con miembros del grupo médico para garantizar que la aplicación satisfaciera las necesidades de los usuarios.

## Documentación

Se generó documentación completa que incluye guías de usuario y manuales técnicos, lo que asegura una fácil transición para los usuarios finales y un soporte adecuado por parte del equipo de desarrollo.

## Iteración y Feedback

Se establecieron canales de comunicación abiertos con los usuarios para recibir feedback continuo. Esto permitió realizar mejoras y ajustes en la aplicación basados en la experiencia real de los usuarios durante las pruebas.

# Experimentación y/o validación

# Cronograma de actividades realizadas

# Riesgos materializados y lecciones aprendidas

# Impactos sociales y ambientales del proyecto

# Desarrollos futuros

# Conclusiones

# Referencias

# Anexos
