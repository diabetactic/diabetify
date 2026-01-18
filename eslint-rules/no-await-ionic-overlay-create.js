/**
 * Disallow awaiting Ionic overlay controller `.create()`.
 *
 * In optimized production builds, overlay web components (ion-loading, ion-toast, etc.)
 * can be tree-shaken when they are only used imperatively via controllers. When that
 * happens, `LoadingController.create()` can hang because the underlying custom element
 * is never defined.
 *
 * This rule enforces the project guardrail: overlay creation must be best-effort and
 * non-blocking (or done via a safe wrapper that enforces timeouts).
 */

const OVERLAY_CONTROLLER_IMPORTS = new Set([
  'LoadingController',
  'ToastController',
  'AlertController',
  'ModalController',
  'ActionSheetController',
  'PopoverController',
  'PickerController',
]);

const OVERLAY_NAME_HINT = /(loading|toast|alert|modal|actionSheet|actionsheet|popover|picker)/i;

function isImportFromIonic(node) {
  return (
    node &&
    node.type === 'ImportDeclaration' &&
    typeof node.source?.value === 'string' &&
    (node.source.value === '@ionic/angular' || node.source.value === '@ionic/angular/standalone')
  );
}

function collectImportedOverlayControllers(program) {
  const imported = new Set();
  for (const bodyNode of program.body ?? []) {
    if (!isImportFromIonic(bodyNode)) continue;
    for (const spec of bodyNode.specifiers ?? []) {
      if (spec.type !== 'ImportSpecifier') continue;
      const importedName = spec.imported?.name;
      if (typeof importedName !== 'string') continue;
      if (OVERLAY_CONTROLLER_IMPORTS.has(importedName)) imported.add(importedName);
    }
  }
  return imported;
}

function getMemberPropertyName(node) {
  if (!node) return null;
  if (node.type !== 'MemberExpression') return null;
  if (node.computed) return null;
  if (node.property && node.property.type === 'Identifier') return node.property.name;
  return null;
}

function getCreateCallInfo(node) {
  if (!node || node.type !== 'CallExpression') return null;
  if (!node.callee || node.callee.type !== 'MemberExpression') return null;
  const propName = getMemberPropertyName(node.callee);
  if (propName !== 'create') return null;

  const calleeObject = node.callee.object;
  if (!calleeObject) return null;

  if (calleeObject.type === 'Identifier') {
    return { objectName: calleeObject.name };
  }

  if (calleeObject.type === 'MemberExpression') {
    const memberName = getMemberPropertyName(calleeObject);
    if (memberName) return { objectName: memberName };
  }

  return { objectName: null };
}

function findCreateCalls(node, out) {
  if (!node) return;

  const info = getCreateCallInfo(node);
  if (info) out.push({ node, objectName: info.objectName });

  // Minimal recursive walk for common await patterns:
  // - await controller.create()
  // - await Promise.all([controller.create(), ...])
  // - await someFn(controller.create())
  if (node.type === 'CallExpression') {
    for (const arg of node.arguments ?? []) findCreateCalls(arg, out);
  } else if (node.type === 'ArrayExpression') {
    for (const el of node.elements ?? []) findCreateCalls(el, out);
  } else if (node.type === 'AwaitExpression') {
    findCreateCalls(node.argument, out);
  } else if (node.type === 'UnaryExpression') {
    findCreateCalls(node.argument, out);
  } else if (node.type === 'ChainExpression') {
    findCreateCalls(node.expression, out);
  } else if (node.type === 'MemberExpression') {
    findCreateCalls(node.object, out);
  }
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow awaiting Ionic overlay controller `.create()`',
    },
    schema: [],
    messages: {
      noAwaitCreate:
        'Do not await Ionic overlay controller `.create()`. In optimized production builds it can hang if the overlay web component is tree-shaken. Use a non-blocking best-effort create/present or a safe wrapper with timeouts.',
    },
  },
  create(context) {
    const sourceCode = context.getSourceCode();
    let importedOverlayControllers = null;

    function ensureImported(program) {
      if (importedOverlayControllers) return;
      importedOverlayControllers = collectImportedOverlayControllers(program);
    }

    return {
      Program(program) {
        ensureImported(program);
      },
      AwaitExpression(node) {
        // Only enforce in files that actually import Ionic overlay controllers.
        const program = sourceCode.ast;
        ensureImported(program);
        if (!importedOverlayControllers || importedOverlayControllers.size === 0) return;

        const calls = [];
        findCreateCalls(node.argument, calls);

        for (const call of calls) {
          const hint = call.objectName ? OVERLAY_NAME_HINT.test(call.objectName) : false;

          // Without type info we rely on naming; if we can't establish a strong hint,
          // avoid false positives.
          if (!hint) continue;

          context.report({
            node: call.node,
            messageId: 'noAwaitCreate',
          });
        }
      },
    };
  },
};

