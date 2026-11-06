// Errores propios del proyecto. Todos HEREDAN de AppError (herencia en POO).
// Cada uno lleva el código HTTP que se le responde al cliente.
export class AppError extends Error {
  constructor(mensaje, estado = 500) {
    super(mensaje);
    this.name = this.constructor.name;
    this.estado = estado;
  }
}

export class ValidationError extends AppError {   // 400: los datos enviados no son válidos
  constructor(mensaje) { super(mensaje, 400); }
}

export class NotFoundError extends AppError {     // 404: no existe lo que se pide
  constructor(mensaje) { super(mensaje, 404); }
}

export class ConflictError extends AppError {     // 409: choca con algo que ya existe
  constructor(mensaje) { super(mensaje, 409); }
}

export class BusinessRuleError extends AppError { // 422: rompe una regla de negocio
  constructor(mensaje) { super(mensaje, 422); }
}
