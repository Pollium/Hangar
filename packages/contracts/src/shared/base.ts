/** Serialized `BaseModel` columns as the client sees them — dates are ISO strings on the wire. */
export interface BaseEntity{
    id: number;
    createdAt: string;
    updatedAt: string;
}
