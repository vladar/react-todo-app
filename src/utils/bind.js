import React from "react";
import { proxy, subscribe } from "valtio";

export function bind(functionalReactComponent, ViewModelClass, componentName) {
  const name =
    componentName ??
    functionalReactComponent.name ??
    ViewModelClass.name ??
    "Unnknown Component";

  let i = 0;
  const instances = new Map();
  const detached = new Map(); // modelKey => time

  return class XyzComponent extends React.PureComponent {
    static displayName = name;
    // static displayName = functionalReactComponent.displayName;
    unsubscribeState = null;
    viewModel = null;
    viewModelKey = null;

    constructor(props) {
      super(props);

      this.viewModelKey = props.modelKey ?? i++;
      this.viewModel = instances.get(this.viewModelKey);

      if (this.viewModel) {
        detached.delete(this.viewModelKey);
        // TODO: It already exists, but we are going to bind it to a new component
        // throw new Error("TODO: handle existing viewModel for new component");
      }

      if (!this.viewModel) {
        this.viewModel = new ViewModelClass(props);
        const proto = Object.getPrototypeOf(this.viewModel);

        Object.getOwnPropertyNames(proto).forEach(key => {
          const value = proto[key];
          if (key !== "constructor" && typeof value === "function") {
            this.viewModel[key] = value.bind(this.viewModel);
          }
        });
        this.viewModel.state = proxy(this.viewModel.state);
        instances.set(this.viewModelKey, this.viewModel);
      }
      this.viewModel.props = props;
      this.unsubscribeState = subscribe(
        this.viewModel.state,
        this.setState.bind(this)
      );
      this.state = this.viewModel.state;
    }

    UNSAFE_componentWillUpdate(nextProps) {
      this.viewModel.props = nextProps;
      if (typeof this.viewModel.propsWillChange !== "function") {
        return;
      }
      const changedProps = {};
      let dirtyProps = false;
      Object.keys(nextProps).forEach((key) => {
        if (nextProps[key] !== this.props[key]) {
          changedProps[key] = nextProps[key];
          dirtyProps = true;
        }
      });
      if (dirtyProps) {
        this.viewModel.propsWillChange(changedProps, nextProps);
      }
    }

    componentWillUnmount() {
      if (this.unsubscribeState) {
        this.unsubscribeState();
      }
      detached.set(this.viewModelKey, new Date().getTime());
      this.viewModelKey = null;
      this.viewModel = null;
      this.unsubscribeState = null;
    }

    render() {
      return functionalReactComponent(this.viewModel);
    }
  };
}
