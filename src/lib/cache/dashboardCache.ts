// Cache simples em memória para dados do dashboard
class DashboardCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttlMinutes: number = 5) {
    const ttl = ttlMinutes * 60 * 1000; // Converter para millisegundos
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  get(key: string) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  clear() {
    this.cache.clear();
  }
  
  delete(key: string) {
    this.cache.delete(key);
  }
  
  // Limpar cache expirado
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const dashboardCache = new DashboardCache();

// Limpar cache expirado a cada 10 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    dashboardCache.cleanup();
  }, 10 * 60 * 1000);
}