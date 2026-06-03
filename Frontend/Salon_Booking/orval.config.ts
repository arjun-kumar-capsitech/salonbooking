export default {
  api: {
    input: {
      target: 'http://localhost:5296/swagger/v1/swagger.json',  
    },
    output: {
      target: './src/api/generated.ts',
      client: 'axios',
      httpClient: 'axios',
      baseUrl: 'http://localhost:5296',  
      clean: true,
    },
  },
};