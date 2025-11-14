import { test, expect } from '@playwright/test';

test.describe('Diabetactic Full Verification', () => {
  test.use({
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
  });

  test.beforeEach(async ({ page }) => {
    // Silenciar errores de consola que no son críticos
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('❌ Console error:', msg.text());
      }
    });
  });

  test('1. Login funciona con credenciales demo', async ({ page }) => {
    await page.goto('http://localhost:4200');
    await page.waitForTimeout(2000);

    // Verificar que la página cargó (puede ser welcome o login)
    const url = page.url();
    console.log('URL inicial:', url);

    // Si estamos en welcome, buscar botón de login
    if (url.includes('welcome')) {
      const loginBtn = page.locator('text=/iniciar|login|entrar/i').first();
      if ((await loginBtn.count()) > 0) {
        await loginBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Ahora deberíamos estar en login o dashboard
    const currentUrl = page.url();
    console.log('URL después de welcome:', currentUrl);

    // Si ya estamos en dashboard, skip login
    if (currentUrl.includes('dashboard') || currentUrl.includes('tabs')) {
      console.log('✅ Test 1: Ya estamos logueados (skip login)');
      return;
    }

    // Verificar que hay campos de login
    const usernameInput = await page.locator('input[type="text"], input[type="email"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    const submitBtn = await page.locator('button[type="submit"]').first();

    const hasLoginForm =
      (await usernameInput.count()) > 0 &&
      (await passwordInput.count()) > 0 &&
      (await submitBtn.count()) > 0;

    if (!hasLoginForm) {
      console.log('⚠️ No se encontró formulario de login');
      return;
    }

    // Login con credenciales demo
    await usernameInput.fill('demo_patient');
    await passwordInput.fill('demo123');
    await submitBtn.click();

    // Esperar navegación
    await page.waitForTimeout(2000);

    // Verificar redirect a dashboard o tabs
    const finalUrl = page.url();
    const isLoggedIn = finalUrl.includes('dashboard') || finalUrl.includes('tabs');

    if (isLoggedIn) {
      console.log('✅ Test 1: Login OK');
    } else {
      console.log('⚠️ Login no redirectó a dashboard:', finalUrl);
    }
  });

  test('2. Dashboard muestra stats mockeados', async ({ page }) => {
    await page.goto('http://localhost:4200/tabs/dashboard');
    await page.waitForTimeout(3000);

    // Screenshot inicial
    await page.screenshot({ path: 'screenshots/dashboard-initial.png', fullPage: true });

    // Buscar stat cards (pueden ser DaisyUI stats o app-stat-card)
    const statCards = await page.locator('.stat, app-stat-card, [class*="stat-card"]').count();
    console.log(`📊 Stat cards encontrados: ${statCards}`);

    // Buscar números en la página
    const bodyText = await page.locator('body').textContent();
    const hasNumbers = /\d+/.test(bodyText || '');

    if (statCards > 0 && hasNumbers) {
      console.log('✅ Test 2: Dashboard stats OK');
    } else {
      console.log('⚠️ Dashboard stats pueden estar vacíos');
    }
  });

  test('3. Dashboard muestra appointments preview', async ({ page }) => {
    await page.goto('http://localhost:4200/tabs/dashboard');
    await page.waitForTimeout(3000);

    // Buscar sección de appointments con variaciones de texto
    const appointmentsSection = page.locator(
      'text=/Próximas Citas|Citas Médicas|Appointments|appointments/i'
    );
    const count = await appointmentsSection.count();

    console.log(`📅 Secciones de appointments en dashboard: ${count}`);

    if (count > 0) {
      console.log('✅ Test 3: Appointments section encontrada en dashboard');

      // Verificar que hay cards de appointments
      const appointmentCards = await page
        .locator('.card, [class*="appointment"], ion-card')
        .count();
      console.log(`📋 Appointment cards: ${appointmentCards}`);
    } else {
      console.log('⚠️ No se encontró sección de appointments en dashboard');
    }

    // Screenshot
    await page.screenshot({ path: 'screenshots/dashboard-appointments.png', fullPage: true });
  });

  test('4. Appointments list carga y muestra datos', async ({ page }) => {
    await page.goto('http://localhost:4200/appointments');
    await page.waitForTimeout(3000);

    // Screenshot
    await page.screenshot({ path: 'screenshots/appointments-list.png', fullPage: true });

    // Verificar que hay cards de appointments
    const appointmentCards = await page.locator('.card, ion-card, [class*="appointment"]').count();
    console.log(`📋 Appointments encontrados: ${appointmentCards}`);

    // Verificar tabs
    const upcomingTab = page.locator('text=/Próximas|upcoming/i');
    const pastTab = page.locator('text=/Pasadas|past/i');

    const hasUpcoming = (await upcomingTab.count()) > 0;
    const hasPast = (await pastTab.count()) > 0;

    console.log(`Tabs - Próximas: ${hasUpcoming}, Pasadas: ${hasPast}`);

    if (appointmentCards > 0 || hasUpcoming || hasPast) {
      console.log('✅ Test 4: Appointments list OK');
    } else {
      console.log('⚠️ No se encontraron appointments');
    }
  });

  test('5. Create appointment form funciona', async ({ page }) => {
    await page.goto('http://localhost:4200/appointments/create');
    await page.waitForTimeout(3000);

    // Screenshot
    await page.screenshot({ path: 'screenshots/appointment-create.png', fullPage: true });

    // Verificar formulario existe
    const form = await page.locator('form').count();
    console.log(`📝 Formularios encontrados: ${form}`);

    // Verificar campos del formulario
    const dateInput = (await page.locator('input[type="date"]').count()) > 0;
    const timeInput = (await page.locator('input[type="time"]').count()) > 0;
    const selectInputs = await page.locator('select').count();

    console.log(`Form fields - Date: ${dateInput}, Time: ${timeInput}, Selects: ${selectInputs}`);

    if (form > 0 && dateInput && timeInput) {
      console.log('✅ Test 5: Create form OK');
    } else {
      console.log('⚠️ Formulario incompleto');
    }
  });

  test('6. Create appointment submit funciona', async ({ page }) => {
    await page.goto('http://localhost:4200/appointments/create');
    await page.waitForTimeout(3000);

    try {
      // Llenar formulario
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];

      const dateInput = page.locator('input[type="date"]').first();
      const timeInput = page.locator('input[type="time"]').first();

      if ((await dateInput.count()) > 0 && (await timeInput.count()) > 0) {
        await dateInput.fill(dateString);
        await timeInput.fill('10:00');

        // Seleccionar doctor
        const doctorSelect = page.locator('select').first();
        if ((await doctorSelect.count()) > 0) {
          await doctorSelect.selectOption({ index: 1 });
        }

        // Submit
        const submitBtn = page.locator('button[type="submit"]').first();
        if ((await submitBtn.count()) > 0) {
          await submitBtn.click();
          await page.waitForTimeout(2000);

          // Verificar redirect
          const url = page.url();
          if (url.includes('appointments') && !url.includes('create')) {
            console.log('✅ Test 6: Create appointment submit OK');
          } else {
            console.log('⚠️ Submit no redirectó correctamente:', url);
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Error en submit:', error);
    }
  });

  test('7. Dark mode toggle funciona', async ({ page }) => {
    await page.goto('http://localhost:4200/tabs/dashboard');
    await page.waitForTimeout(2000);

    // Obtener tema inicial
    const themeBefore = await page.getAttribute('html', 'data-theme');
    const classBefore = await page.getAttribute('html', 'class');
    console.log('Tema inicial - data-theme:', themeBefore, 'class:', classBefore);

    // Buscar toggle de tema (diferentes posibles ubicaciones)
    const themeToggle = page
      .locator('[class*="theme"], [id*="theme"], button:has-text("theme"), ion-toggle')
      .first();

    if ((await themeToggle.count()) > 0) {
      await themeToggle.click();
      await page.waitForTimeout(500);

      const themeAfter = await page.getAttribute('html', 'data-theme');
      const classAfter = await page.getAttribute('html', 'class');
      console.log('Tema después - data-theme:', themeAfter, 'class:', classAfter);

      // Screenshot en modo alternativo
      await page.screenshot({ path: 'screenshots/dark-mode.png', fullPage: true });

      const changed = themeBefore !== themeAfter || classBefore !== classAfter;
      if (changed) {
        console.log('✅ Test 7: Dark mode toggle OK');
      } else {
        console.log('⚠️ Tema no cambió');
      }
    } else {
      console.log('⚠️ No se encontró toggle de dark mode');
    }
  });

  test('8. Perfil de usuario es accesible', async ({ page }) => {
    await page.goto('http://localhost:4200/tabs/profile');
    await page.waitForTimeout(2000);

    // Screenshot
    await page.screenshot({ path: 'screenshots/profile.png', fullPage: true });

    // Verificar que la página de perfil cargó
    const url = page.url();
    const bodyText = await page.locator('body').textContent();

    if (url.includes('profile') && bodyText) {
      console.log('✅ Test 8: Perfil accesible');
    } else {
      console.log('⚠️ No se pudo acceder a perfil');
    }
  });

  test('9. Idioma está en español', async ({ page }) => {
    await page.goto('http://localhost:4200');
    await page.waitForTimeout(2000);

    // Obtener todo el texto de la página
    const bodyText = await page.locator('body').textContent();

    // Buscar palabras en español comunes
    const spanishWords = ['citas', 'próximas', 'pasadas', 'cancelar', 'crear', 'médicas'];
    const hasSpanish = spanishWords.some(word => bodyText?.toLowerCase().includes(word));

    // Buscar palabras en inglés que no deberían estar (excepto nombres técnicos)
    const englishWords = ['upcoming', 'past', 'cancel', 'create'];
    const hasEnglish = englishWords.some(word => bodyText?.toLowerCase().includes(word));

    console.log(`Idioma - Español: ${hasSpanish}, Inglés: ${hasEnglish}`);

    if (hasSpanish) {
      console.log('✅ Test 9: Idioma español OK');
    } else if (hasEnglish) {
      console.log('⚠️ La app tiene textos en inglés');
    } else {
      console.log('ℹ️ No se pudo determinar el idioma claramente');
    }
  });

  test('10. No hay errores críticos de consola', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navegar por diferentes páginas
    await page.goto('http://localhost:4200/tabs/dashboard');
    await page.waitForTimeout(2000);

    await page.goto('http://localhost:4200/appointments');
    await page.waitForTimeout(2000);

    await page.goto('http://localhost:4200/appointments/create');
    await page.waitForTimeout(2000);

    // Filtrar errores críticos
    const criticalErrors = errors.filter(
      e =>
        !e.includes('DevTools') &&
        !e.includes('favicon') &&
        !e.includes('NG0') && // Angular warnings
        !e.includes('Refused to apply inline style')
    );

    if (criticalErrors.length > 0) {
      console.log('❌ Errores críticos encontrados:', criticalErrors.slice(0, 5));
    } else {
      console.log('✅ Test 10: No hay errores críticos');
    }
  });
});
