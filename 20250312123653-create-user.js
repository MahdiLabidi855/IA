'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', { 
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      firstName: { 
        type: DataTypes.STRING, 
        allowNull: true, 
      },
      lastName: { 
        type: DataTypes.STRING, 
        allowNull: true, 
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      mdp: {
        type: Sequelize.STRING,
        allowNull: false
      },
      defaultMdp: {
        type: Sequelize.STRING,
        allowNull: true
      }, 
      roleUtilisateur: {
        type: Sequelize.ENUM('Admin', 'Formateur', 'Apprenant'),
        allowNull: false
      },
      photo: {
        type: Sequelize.STRING,
        allowNull: true
      },
      tel: {
        type: Sequelize.STRING,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      derConnx: {
        type: Sequelize.DATE
      },
      mustUpdatePassword: {
        type: Sequelize.BOOLEAN,
        defaultValue: true 
      }, 
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deletedAt: { 
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Users');
  }
};
