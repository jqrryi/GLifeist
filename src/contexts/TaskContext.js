// src/contexts/TaskContext.js
import React, { createContext, useContext, useState } from 'react';

const TaskContext = createContext();

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};

export const TaskProvider = ({ children, onAddTaskRequested }) => {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskCommand, setTaskCommand] = useState('');

  const requestAddTask = (command) => {
    console.log('TaskContext: Requesting task with command:', command);
    setTaskCommand(command);
    setShowTaskModal(true);
    if (onAddTaskRequested) {
      onAddTaskRequested(command);
    }
  };

  const closeTaskModal = () => {
    console.log('TaskContext: Closing task modal');
    setShowTaskModal(false);
    setTaskCommand('');
  };

  const value = {
    showTaskModal,
    taskCommand,
    requestAddTask,
    closeTaskModal
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};
