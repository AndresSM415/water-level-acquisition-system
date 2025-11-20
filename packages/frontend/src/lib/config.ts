const ROOT_PATH = import.meta.env.ROOT_PATH || './';
console.log(ROOT_PATH + "aaa")
export const config = {
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000'
} as const;
console.log(config.apiUrl)
