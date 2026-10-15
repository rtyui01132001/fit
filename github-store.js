class GitHubDiaryStore {
  constructor({owner, repo, branch, path, token}) {
    if (!owner || !repo || !branch || !path || !token) throw new Error('請填寫完整連線設定');
    if (!path.endsWith('.json') || path.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('檔案路徑必須是有效的 JSON 路徑');
    this.branch = branch; this.token = token; this.sha = null; this.blocked = false;
    this.url = 'https://api.github.com/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo) + '/contents/' + path.split('/').map(encodeURIComponent).join('/');
  }
  async request(method, body) {
    const res = await fetch(this.url + (method === 'GET' ? '?ref=' + encodeURIComponent(this.branch) : ''), {
      method, cache: 'no-store', headers: {Accept:'application/vnd.github+json', Authorization:'Bearer ' + this.token,
        'X-GitHub-Api-Version':'2026-03-10', ...(body ? {'Content-Type':'application/json'} : {})},
      ...(body ? {body:JSON.stringify(body)} : {})
    });
    if (!res.ok) {
      const messages = {401:'權杖無效或已過期',403:'沒有存取權限或 API 額度不足',404:'找不到儲存庫、分支或檔案，或權杖沒有權限',409:'線上檔案已有其他變更，請匯出備份後重新讀取',422:'GitHub 拒絕儲存，請檢查分支規則或稍後重試'};
      if (res.status === 409 || res.status === 422) this.blocked = true;
      const error = new Error(messages[res.status] || 'GitHub 請求失敗：' + res.status);
      error.status = res.status; throw error;
    }
    return res.json();
  }
  async read() {
    const file = await this.request('GET');
    if (file.encoding !== 'base64' || !file.sha) throw new Error('不支援的檔案格式或檔案超過 1 MB');
    const bytes = Uint8Array.from(atob(file.content.replace(/\s/g,'')), c=>c.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    this.sha = file.sha; this.blocked = false;
    return data;
  }
  async write(data) {
    if (this.blocked) throw new Error('版本衝突：請先匯出備份，再重新讀取線上資料');
    if (!this.sha) throw new Error('請先讀取已存在的 data.json，確認路徑後再儲存');
    const bytes = new TextEncoder().encode(JSON.stringify(data,null,2)+'\n');
    let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
    const result = await this.request('PUT', {message:'Update health diary [skip ci]',branch:this.branch,sha:this.sha,content:btoa(binary)});
    if (!result.content?.sha) { this.blocked = true; throw new Error('無法確認儲存結果，請重新讀取線上資料'); }
    this.sha = result.content.sha;
  }
}
if (typeof module !== 'undefined') module.exports = GitHubDiaryStore;
