"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireDefault(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _reactDom = _interopRequireDefault(require("react-dom"));

var _classnames = _interopRequireDefault(require("classnames"));

var _domFns = require("./utils/domFns");

var _positionFns = require("./utils/positionFns");

var _shims = require("./utils/shims");

var _DraggableCore = _interopRequireDefault(require("./DraggableCore"));

var _log = _interopRequireDefault(require("./utils/log"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

//
// Define <Draggable>
//
class Draggable extends _react.default.Component {
  // React 16.3+
  // Arity (props, state)
  static getDerivedStateFromProps({
    position
  }
  /*: DraggableProps*/
  , {
    prevPropsPosition
  }
  /*: DraggableState*/
  ) {
    // Set x/y if a new position is provided in props that is different than the previous.
    if (position && (!prevPropsPosition || position.x !== prevPropsPosition.x || position.y !== prevPropsPosition.y)) {
      (0, _log.default)('Draggable: getDerivedStateFromProps %j', {
        position,
        prevPropsPosition
      });
      return {
        x: position.x,
        y: position.y,
        prevPropsPosition: { ...position
        }
      };
    }

    return null;
  }

  constructor(props
  /*: DraggableProps*/
  ) {
    super(props);

    _defineProperty(this, "onDragStart", (e, coreData) => {
      (0, _log.default)('Draggable: onDragStart: %j', coreData); // Short-circuit if user's callback killed it.

      const shouldStart = this.props.onStart(e, (0, _positionFns.createDraggableData)(this, coreData)); // Kills start event on core as well, so move handlers are never bound.

      if (shouldStart === false) return false;
      this.setState({
        dragging: true,
        dragged: true
      });
    });

    _defineProperty(this, "onDrag", (e, coreData) => {
      if (!this.state.dragging) return false;
      (0, _log.default)('Draggable: onDrag: %j', coreData);
      const uiData = (0, _positionFns.createDraggableData)(this, coreData);
      const newState
      /*: $Shape<DraggableState>*/
      = {
        x: uiData.x,
        y: uiData.y
      }; // Keep within bounds.

      if (this.props.bounds) {
        // Save original x and y.
        const {
          x,
          y
        } = newState; // Add slack to the values used to calculate bound position. This will ensure that if
        // we start removing slack, the element won't react to it right away until it's been
        // completely removed.

        newState.x += this.state.slackX;
        newState.y += this.state.slackY; // Get bound position. This will ceil/floor the x and y within the boundaries.

        const [newStateX, newStateY] = (0, _positionFns.getBoundPosition)(this, newState.x, newState.y);
        newState.x = newStateX;
        newState.y = newStateY; // Recalculate slack by noting how much was shaved by the boundPosition handler.

        newState.slackX = this.state.slackX + (x - newState.x);
        newState.slackY = this.state.slackY + (y - newState.y); // Update the event we fire to reflect what really happened after bounds took effect.

        uiData.x = newState.x;
        uiData.y = newState.y;
        uiData.deltaX = newState.x - this.state.x;
        uiData.deltaY = newState.y - this.state.y;
      } // Short-circuit if user's callback killed it.


      const shouldUpdate = this.props.onDrag(e, uiData);
      if (shouldUpdate === false) return false;
      this.setState(newState);
    });

    _defineProperty(this, "onDragStop", (e, coreData) => {
      if (!this.state.dragging) return false; // Short-circuit if user's callback killed it.

      const shouldStop = this.props.onStop(e, (0, _positionFns.createDraggableData)(this, coreData));
      if (shouldStop === false) return false;
      (0, _log.default)('Draggable: onDragStop: %j', coreData);
      const newState
      /*: $Shape<DraggableState>*/
      = {
        dragging: false,
        slackX: 0,
        slackY: 0
      }; // If this is a controlled component, the result of this operation will be to
      // revert back to the old position. We expect a handler on `onDragStop`, at the least.

      const controlled = Boolean(this.props.position);

      if (controlled) {
        const {
          x,
          y
        } = this.props.position;
        newState.x = x;
        newState.y = y;
      }

      this.setState(newState);
    });

    this.state = {
      // Whether or not we are currently dragging.
      dragging: false,
      // Whether or not we have been dragged before.
      dragged: false,
      // Current transform x and y.
      x: props.position ? props.position.x : props.defaultPosition.x,
      y: props.position ? props.position.y : props.defaultPosition.y,
      prevPropsPosition: { ...props.position
      },
      // Used for compensating for out-of-bounds drags
      slackX: 0,
      slackY: 0,
      // Can only determine if SVG after mounting
      isElementSVG: false
    };

    if (props.position && !(props.onDrag || props.onStop)) {
      // eslint-disable-next-line no-console
      console.warn('A `position` was applied to this <Draggable>, without drag handlers. This will make this ' + 'component effectively undraggable. Please attach `onDrag` or `onStop` handlers so you can adjust the ' + '`position` of this element.');
    }
  }

  componentDidMount() {
    // Check to see if the element passed is an instanceof SVGElement
    if (typeof window.SVGElement !== 'undefined' && _reactDom.default.findDOMNode(this) instanceof window.SVGElement) {
      this.setState({
        isElementSVG: true
      });
    }
  }

  componentWillUnmount() {
    this.setState({
      dragging: false
    }); // prevents invariant if unmounted while dragging
  }

  render()
  /*: ReactElement<any>*/
  {
    const {
      axis,
      bounds,
      children,
      defaultPosition,
      defaultClassName,
      defaultClassNameDragging,
      defaultClassNameDragged,
      position,
      positionOffset,
      scale,
      ...draggableCoreProps
    } = this.props;
    let style = {};
    let svgTransform = null; // If this is controlled, we don't want to move it - unless it's dragging.

    const controlled = Boolean(position);
    const draggable = !controlled || this.state.dragging;
    const validPosition = position || defaultPosition;
    const transformOpts = {
      // Set left if horizontal drag is enabled
      x: (0, _positionFns.canDragX)(this) && draggable ? this.state.x : validPosition.x,
      // Set top if vertical drag is enabled
      y: (0, _positionFns.canDragY)(this) && draggable ? this.state.y : validPosition.y
    }; // If this element was SVG, we use the `transform` attribute.

    if (this.state.isElementSVG) {
      svgTransform = (0, _domFns.createSVGTransform)(transformOpts, positionOffset);
    } else {
      // Add a CSS transform to move the element around. This allows us to move the element around
      // without worrying about whether or not it is relatively or absolutely positioned.
      // If the item you are dragging already has a transform set, wrap it in a <span> so <Draggable>
      // has a clean slate.
      style = (0, _domFns.createCSSTransform)(transformOpts, positionOffset);
    } // Mark with class while dragging


    const className = (0, _classnames.default)(children.props.className || '', defaultClassName, {
      [defaultClassNameDragging]: this.state.dragging,
      [defaultClassNameDragged]: this.state.dragged
    }); // Reuse the child provided
    // This makes it flexible to use whatever element is wanted (div, ul, etc)

    return _react.default.createElement(_DraggableCore.default, _extends({}, draggableCoreProps, {
      onStart: this.onDragStart,
      onDrag: this.onDrag,
      onStop: this.onDragStop
    }), _react.default.cloneElement(_react.default.Children.only(children), {
      className: className,
      style: { ...children.props.style,
        ...style
      },
      transform: svgTransform
    }));
  }

}

exports.default = Draggable;

_defineProperty(Draggable, "displayName", 'Draggable');

_defineProperty(Draggable, "propTypes", { // Accepts all props <DraggableCore> accepts.
  ..._DraggableCore.default.propTypes,

  /**
   * `axis` determines which axis the draggable can move.
   *
   *  Note that all callbacks will still return data as normal. This only
   *  controls flushing to the DOM.
   *
   * 'both' allows movement horizontally and vertically.
   * 'x' limits movement to horizontal axis.
   * 'y' limits movement to vertical axis.
   * 'none' limits all movement.
   *
   * Defaults to 'both'.
   */
  axis: _propTypes.default.oneOf(['both', 'x', 'y', 'none']),

  /**
   * `bounds` determines the range of movement available to the element.
   * Available values are:
   *
   * 'parent' restricts movement within the Draggable's parent node.
   *
   * Alternatively, pass an object with the following properties, all of which are optional:
   *
   * {left: LEFT_BOUND, right: RIGHT_BOUND, bottom: BOTTOM_BOUND, top: TOP_BOUND}
   *
   * All values are in px.
   *
   * Example:
   *
   * ```jsx
   *   let App = React.createClass({
   *       render: function () {
   *         return (
   *            <Draggable bounds={{right: 300, bottom: 300}}>
   *              <div>Content</div>
   *           </Draggable>
   *         );
   *       }
   *   });
   * ```
   */
  bounds: _propTypes.default.oneOfType([_propTypes.default.shape({
    left: _propTypes.default.number,
    right: _propTypes.default.number,
    top: _propTypes.default.number,
    bottom: _propTypes.default.number
  }), _propTypes.default.string, _propTypes.default.oneOf([false])]),
  defaultClassName: _propTypes.default.string,
  defaultClassNameDragging: _propTypes.default.string,
  defaultClassNameDragged: _propTypes.default.string,

  /**
   * `defaultPosition` specifies the x and y that the dragged item should start at
   *
   * Example:
   *
   * ```jsx
   *      let App = React.createClass({
   *          render: function () {
   *              return (
   *                  <Draggable defaultPosition={{x: 25, y: 25}}>
   *                      <div>I start with transformX: 25px and transformY: 25px;</div>
   *                  </Draggable>
   *              );
   *          }
   *      });
   * ```
   */
  defaultPosition: _propTypes.default.shape({
    x: _propTypes.default.number,
    y: _propTypes.default.number
  }),
  positionOffset: _propTypes.default.shape({
    x: _propTypes.default.oneOfType([_propTypes.default.number, _propTypes.default.string]),
    y: _propTypes.default.oneOfType([_propTypes.default.number, _propTypes.default.string])
  }),

  /**
   * `position`, if present, defines the current position of the element.
   *
   *  This is similar to how form elements in React work - if no `position` is supplied, the component
   *  is uncontrolled.
   *
   * Example:
   *
   * ```jsx
   *      let App = React.createClass({
   *          render: function () {
   *              return (
   *                  <Draggable position={{x: 25, y: 25}}>
   *                      <div>I start with transformX: 25px and transformY: 25px;</div>
   *                  </Draggable>
   *              );
   *          }
   *      });
   * ```
   */
  position: _propTypes.default.shape({
    x: _propTypes.default.number,
    y: _propTypes.default.number
  }),

  /**
   * These properties should be defined on the child, not here.
   */
  className: _shims.dontSetMe,
  style: _shims.dontSetMe,
  transform: _shims.dontSetMe
});

_defineProperty(Draggable, "defaultProps", { ..._DraggableCore.default.defaultProps,
  axis: 'both',
  bounds: false,
  defaultClassName: 'react-draggable',
  defaultClassNameDragging: 'react-draggable-dragging',
  defaultClassNameDragged: 'react-draggable-dragged',
  defaultPosition: {
    x: 0,
    y: 0
  },
  position: null,
  scale: 1
});