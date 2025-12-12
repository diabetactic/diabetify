async function login(mcp, userId = '1000', password = 'tuvieja') {
  await mcp.screenshot({ name: 'before_login' });
  await mcp.tap({ element: "Let's Go or Vamos button" });
  await mcp.type({ element: 'username field', text: userId });
  await mcp.type({ element: 'password field', text: password });
  await mcp.tap({ element: 'login button' });
  await mcp.waitFor({ element: 'dashboard or statistics', timeout: 10000 });
  await mcp.screenshot({ name: 'after_login' });
}

module.exports = { login };
