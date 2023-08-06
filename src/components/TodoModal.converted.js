import React from 'react';
import { v4 as uuid } from 'uuid';
import { MdOutlineClose } from 'react-icons/md';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { addTodo, updateTodo } from '../slices/todoSlice';
import styles from '../styles/modules/modal.module.scss';
import Button from './Button';
import { store } from '../app/store';
import { bind } from "../utils/bind";

const dropIn = {
  hidden: {
    opacity: 0,
    transform: 'scale(0.9)',
  },
  visible: {
    transform: 'scale(1)',
    opacity: 1,
    transition: {
      duration: 0.1,
      type: 'spring',
      damping: 25,
      stiffness: 500,
    },
  },
  exit: {
    transform: 'scale(0.9)',
    opacity: 0,
  },
};

class ViewModel {
  props = {
    type: "add",
    todo: null,
    modalOpen: false,
    setModalOpen: null,
  }

  state = {
    title: "",
    status: 'incomplete',
  };

  constructor(props) {
    this.props = props;
    this.propsWillChange(props, props);
  }

  // Similar to willComponentUpdate, but safer, because ViewModel has its own lifecycle and can survive react re-mounts.
  // Note: Fires only when props change, state changes don't trigger this, because the state is fully controlled by
  //   this viewModel and refactoring the viewModel is the right way (vs state change footgun)
  // TODO: downsides compared to getDerivedStateFromProps() ?
  propsWillChange(changed) {
    const state = this.state;
    if (changed.todo) {
      state.title = changed.todo.title ?? '';
      state.status = changed.todo.status ?? 'incomplete';
    }
  }

  hide() {
    this.props.setModalOpen(false);
  }

  handleSubmit(e) {
    e.preventDefault();
    const { type, todo, setModalOpen } = this.props;
    const { title, status } = this.state;

    if (title === '') {
      toast.error('Please enter a title');
      return;
    }
    if (title && status) {
      if (type === 'add') {
        store.dispatch(
          addTodo({
            id: uuid(),
            title,
            status,
            time: new Date().toLocaleString(),
          })
        );
        toast.success('Task added successfully');
      }
      if (type === 'update') {
        if (todo.title !== title || todo.status !== status) {
          store.dispatch(updateTodo({ ...todo, title, status }));
          toast.success('Task Updated successfully');
        } else {
          toast.error('No changes made');
          return;
        }
      }
      setModalOpen(false);
    }
  }
}

function TodoModal(viewModel) {
  const state = viewModel.state;
  const { type, modalOpen } = viewModel.props;

  return (
    <AnimatePresence>
      {modalOpen && (
        <motion.div
          className={styles.wrapper}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={styles.container}
            variants={dropIn}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div
              className={styles.closeButton}
              onKeyDown={viewModel.hide}
              onClick={viewModel.hide}
              role="button"
              tabIndex={0}
              // animation
              initial={{ top: 40, opacity: 0 }}
              animate={{ top: -10, opacity: 1 }}
              exit={{ top: 40, opacity: 0 }}
            >
              <MdOutlineClose />
            </motion.div>

            <form className={styles.form} onSubmit={viewModel.handleSubmit}>
              <h1 className={styles.formTitle}>
                {type === 'add' ? 'Add' : 'Update'} TODO
              </h1>
              <label htmlFor="title">
                Title
                <input
                  type="text"
                  id="title"
                  value={state.title}
                  onChange={(e) => { state.title = e.target.value; }}
                />
              </label>
              <label htmlFor="type">
                Status
                <select
                  id="type"
                  value={state.status}
                  onChange={(e) => { state.status = e.target.value; }}
                >
                  <option value="incomplete">Incomplete</option>
                  <option value="complete">Completed</option>
                </select>
              </label>
              <div className={styles.buttonContainer}>
                <Button type="submit" variant="primary">
                  {type === 'add' ? 'Add Task' : 'Update Task'}
                </Button>
                <Button variant="secondary" onClick={viewModel.hide}>
                  Cancel
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default bind(TodoModal, ViewModel);
