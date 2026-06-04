// Unified API service with rate limiting and caching
class APIService {
  constructor() {
    this.cache = new Map();
    this.requestQueue = [];
    this.isProcessing = false;
    this.MIN_REQUEST_INTERVAL = 1200; // safe buffer over CF's 1 req/sec limit
  }

  async queueRequest(url) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ url, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;

    this.isProcessing = true;
    const { url, resolve, reject } = this.requestQueue.shift();

    try {
      // Return cached result if still fresh (5 min TTL)
      if (this.cache.has(url)) {
        resolve(this.cache.get(url));
        this.isProcessing = false;
        setTimeout(() => this.processQueue(), this.MIN_REQUEST_INTERVAL);
        return;
      }

      const response = await fetch(url);

      if (response.status === 403) {
        throw new Error("CF_RATE_LIMITED");
      }

      if (!response.ok) {
        throw new Error(`HTTP_ERROR_${response.status}`);
      }

      const data = await response.json();

      if (data.status !== "OK") {
        throw new Error(`CF_API_ERROR: ${data.comment || "Unknown error"}`);
      }

      // Cache successful responses for 5 minutes
      this.cache.set(url, data);
      setTimeout(() => this.cache.delete(url), 5 * 60 * 1000);

      resolve(data);
    } catch (error) {
      console.warn(`[APIService] Request failed for ${url}:`, error.message);
      reject(error);
    } finally {
      this.isProcessing = false;
      setTimeout(() => this.processQueue(), this.MIN_REQUEST_INTERVAL);
    }
  }

  // Convenience methods
  async getContests() {
    return this.queueRequest("/api/contest.list?gym=false");
  }

  async getUserInfo(handles) {
    return this.queueRequest(`/api/user.info?handles=${encodeURIComponent(handles)}`);
  }

  async getRecentActions(maxCount = 30) {
    return this.queueRequest(`/api/recentActions?maxCount=${maxCount}`);
  }

  async getBlogEntry(blogEntryId) {
    return this.queueRequest(`/api/blogEntry.view?blogEntryId=${blogEntryId}`);
  }
}

export const apiService = new APIService();