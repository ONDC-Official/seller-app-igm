import { Model, DataTypes } from "sequelize";
import sequelize from "../database/postgress";

class LogisticsSelectedRequest extends Model {}

LogisticsSelectedRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    logisticsTransactionId: {
      type: DataTypes.STRING,
    },
    providerId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    packaging: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    selectedLogistics: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    selectRequest: {
      type: DataTypes.JSONB,
    },
    onSelectResponse: {
      type: DataTypes.JSONB,
    },
  },
  {
    sequelize,
    modelName: "SelectRequest",
    freezeTableName: true,
  }
);

export default LogisticsSelectedRequest;
