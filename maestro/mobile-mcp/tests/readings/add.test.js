const { login } = require('../../scripts/login');

runTest('Add Reading', async (mcp) => {
  await login(mcp);
  await mcp.tap({ element: 'Readings tab' });
  await mcp.tap({ element: 'Add button or FAB' });
  await mcp.type({ element: 'glucose input', text: '120' });
  await mcp.tap({ element: 'Save' });
  await mcp.verify({ element: '120 mg/dL in list' });
});
