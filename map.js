/**
 * @desc util for skill map 
 * @param {*} container 
 * @param {*} source 
 * @param {*} params 
 * @param {*} cb 
 */

var SkillMapGenerator = function (container, source, params, cb) {
    if (!(this instanceof SkillMapGenerator)) return new SkillMapGenerator(container, source, params);
    source.background = "#464646";
    var defaults = {
        svgWidth: null,
        width: 750,
        height: 600,
        leafDistance: 1,
        lineColor: "#bebebe",
        lineWidth: 3,
        parentMaxR: 60,
        rootMaxR: 200,
        childrenMaxR: 350,
        leafMaxR: 60,
        fontSize: "17px",
        rootFontSize: "25px",
        textColor: "#f8f8f8",
        className: "stuq-atlas"
    };
    var s = this;
    s.clickNodeHandler = cb;
    s.container = d3.select(container);
    s.source = source;
    s.defaults = defaults;
    s.options = {};
    for (var n in defaults) {
        s.options[n] = defaults[n];
    }
    params = params || {};
    for (var n in params) {
        s.options[n] = params[n];
    }

    s.width = 0;
    s.height = 0;
    s.mode = 1;
    s.pc = true;

    s.parent = {};
    s.root = {};
    s.children = {};
    s.leaf = {};

    s.tree = d3.layout.tree();
    s.svg = s.container.append("svg")
        .attr("class", s.options.className)
        .append("g");
    s.nodes = s.tree.nodes(s.source);
    s.current = s.nodes[0];
    s.color = d3.scale.category10();

    // Default you click the first current node
    // second param is 1 to differ from click
    s.clickNodeHandler(s.current, 1);

    s.tools = {};
    s.tools.t = function (x, y) { return "translate(" + x + ", " + y + ")"; };
    s.tools.f = function (f) { return Math.round(f * 1000) / 1000 };
    s.tools.m = function (n) {
        s.pc = s.width > s.options.width && s.height > s.options.height;
        if ((s.pc && n > 8) || (!s.pc && n > 6)) {
            s.mode = 0;
        } else {
            s.mode = 1;
        }
    };
    s.tools.l = function (cx, cy, r, angle) {
        var x = cx - r * Math.sin(angle);
        var y = cy - r * Math.cos(angle);
        return { cx: s.tools.f(x), cy: s.tools.f(y) }
    };
    s.tools.c = function (d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(s.tools.c);
            d.children = null;
        }
    };
    s.tools.a = function (x, y) {
        var a = s.children.cx, b = s.children.cy;
        if (x <= a && y <= b) {
            return Math.atan((a - x) / (b - y));
        } else if (x <= a && y >= b) {
            return Math.atan((y - b) / (a - x)) + Math.PI * 0.5;
        } else if (x >= a && y >= b) {
            return Math.atan((x - a) / (y - b)) + Math.PI;
        } else {
            return Math.atan((b - y) / (x - a)) + Math.PI * 1.5;
        }
    };

    s.calc = function (n) {
        s.root.r = Math.min(Math.min(s.width, s.height) * 0.16, s.options.rootMaxR);
        s.children.r = Math.min(Math.min(s.width, s.height) * 0.35, s.options.childrenMaxR);
        s.leaf.r = Math.min(Math.min(s.width, s.height) * 0.12, s.options.leafMaxR);
        if (!s.mode && n > 0) {
            var r = s.tools.f(s.leaf.r / Math.sin(Math.PI / n / s.options.leafDistance));
            r = Math.max(r, 2 * s.leaf.r + s.root.r, Math.sqrt(2) * Math.min(s.width, s.height) / 2);
            var cx = Math.sqrt(2) / 2 * ((Math.sqrt(2) - 1) * Math.max(s.width, s.height) + r), cy = cx;
            s.root.cx = Math.min(cx, s.width - 1.2 * s.root.r);
            s.root.cy = Math.min(cy + 0.618 * s.root.r, s.height - 1.2 * s.root.r);
            if (!s.pc && s.height < s.width && cy - r - s.leaf.r > 1.2 * s.leaf.r) {
                r += s.leaf.r;
            }
            s.children.r = r;
            if (r + s.leaf.r > Math.min(cx, cy)) {
                var d = r + s.leaf.r - Math.min(cx, cy);
                cx += d;
                cy += d;
            }
            s.children.cx = cx;
            s.children.cy = cy;
        } else {
            s.root.cx = s.width / 2;
            s.root.cy = s.height / 2;
            s.children.cx = s.root.cx;
            s.children.cy = s.root.cy;
        }
        s.parent.r = Math.min(Math.min(s.width, s.height) * 0.3, s.options.parentMaxR, s.root.r);
        s.parent.cx = s.parent.r + 5;
        s.parent.cy = s.parent.r;
    };

    s.render = function () {
        if (s.current.parent) {
            s.renderParent();
        }
        if (s.current.children && s.current.children.length > 0) {
            s.renderChildren();
        }
        s.renderRoot();
        s.attachEvents();
    };
    // 渲染父节点
    s.renderParent = function () {
        var lineNode = s.svg.append("g")
            .attr("class", "line");
        lineNode.append("line")
            .attr("x1", s.parent.cx)
            .attr("y1", s.parent.cy)
            .attr("x2", s.root.cx)
            .attr("y2", s.root.cy)
            .attr("stroke", s.options.lineColor)
            .attr("stroke-width", s.options.lineWidth);
        var parentNode = s.svg.selectAll("g.parent")
            .data([s.current.parent])
            .enter()
            .append("g")
            .attr("class", "parent")
            .attr("transform", s.tools.t(s.parent.cx, s.parent.cy))
            .attr("cursor", "pointer");
        parentNode.append("circle")
            .attr("r", s.parent.r)
            .style("fill", function (d) { return d.background || s.color(d.index); });
        parentNode.append("text")
            .text(function (d) { return d.name; })
            .attr("font-size", defaults.fontSize)
            .attr("class", "title")
            .attr("text-anchor", "middle")
            .attr("fill", function (d) { return d.color || s.options.textColor; })
            .each(function (d) {
                d3plus.textwrap().container(d3.select(this)).valign("middle").draw();
            });
    };
    s.renderRoot = function () {
        var rootNode = s.svg.selectAll("g.root")
            .data([s.current])
            .enter()
            .append("g")
            .attr("class", "root")
            .attr("transform", s.tools.t(s.root.cx, s.root.cy));
        rootNode.append("circle")
            .attr("r", s.root.r)
            .style("fill", function (d) { return d.background || s.color(d.index); });
        rootNode.append("text")
            .text(function (d) { return d.name; })
            .attr("font-size", defaults.rootFontSize)
            .attr("class", "title")
            .attr("text-anchor", "middle")
            .attr("fill", function (d) { return d.color || s.options.textColor; })
            .each(function (d) {
                d3plus.textwrap().container(d3.select(this)).valign("middle").draw();
            });
    };
    s.renderChildren = function () {
        s.current.children.forEach(s.tools.c);
        var childrenNode = s.svg.append("g").attr("class", "children");
        var circle = childrenNode.append("circle")
            .attr("cx", s.children.cx)
            .attr("cy", s.children.cy)
            .attr("r", s.children.r)
            .attr("fill", "none")
            .attr("stroke", s.options.lineColor)
            .attr("stroke-width", 0);
        var leafNode = childrenNode.selectAll("g.leaf")
            .data(s.current.children)
            .enter()
            .append("g")
            .attr("class", "leaf")
            .attr("fill-opacity", "0.5")
            .attr("transform", function (d) {
                d.angle = 2 * Math.PI / s.current.children.length * d.index;
                var c = s.tools.l(s.children.cx, s.children.cy, s.children.r * 0.5, d.angle);
                return s.tools.t(c.cx, c.cy);
            })
            .attr("cursor", function (d) {
                // every node can be clicked
                return "pointer";
            });
        if (s.pc) {
            leafNode
                .on("mouseenter", function () {
                    d3.select(this).selectAll("circle")
                        .transition()
                        .duration(135)
                        .attr("r", s.leaf.r * 1.32);
                })
                .on("mouseleave", function () {
                    d3.select(this).selectAll("circle")
                        .transition()
                        .duration(135)
                        .attr("r", s.leaf.r);
                });
        }
        leafNode.append("circle")
            .attr("r", s.leaf.r)
            .style("fill", function (d) { return d.background || s.color(d.index); });
        leafNode.append("text")
            .text(function (d) { return d.name; })
            .attr("font-size", defaults.fontSize)
            .attr("class", "title")
            .attr("text-anchor", "middle")
            .attr("fill", function (d) { return d.color || s.options.textColor; })
            .each(function (d) {
                d3plus.textwrap().container(d3.select(this)).valign("middle").draw();
            });
        //TODO if you click one node, either it has child or not ,▾ will appear
        leafNode.each(function (d) {
            if (d.children || d._children) {
                if (d._children.length > 0) {
                    d3.select(this).append("text")
                        .text("▾")
                        .attr("class", "more")
                        .attr("y", s.leaf.r)
                        .attr("dy", -5)
                        .attr("text-anchor", "middle")
                        .attr("fill", function (d) { return d.color || s.options.textColor; })
                        .attr("fill-opacity", "0.5");
                }

            }
        });
        circle.transition()
            .delay(200)
            .duration(50)
            .attr("stroke-width", s.options.lineWidth);
        leafNode.transition()
            .duration(150)
            .ease("linear")
            .attr("fill-opacity", "1")
            .attr("transform", function (d) {
                d.angle = 2 * Math.PI / s.current.children.length * d.index;
                var c = s.tools.l(s.children.cx, s.children.cy, s.children.r, d.angle);
                return s.tools.t(c.cx, c.cy);
            });
    };

    s.clickLeaf = function (d) {
        if (d3.event.defaultPrevented) return;
        if (d._children) {
            d.children = d._children;
            d._children = null;
            s.current = d;
            s.clickNodeHandler(s.current);
            s.remove();
            s.draw();
            s.render();
        } else {
            // if current node does not have any child
            d.children = [];
            d._children = null;
            s.current = d;
            s.clickNodeHandler(s.current);
            s.remove();
            s.draw();
            s.render();
        }
    };
    s.clickParent = function (d) {
        if (d3.event.defaultPrevented) return;
        if (d._children) {
            d.children = d._children;
            d._children = null;
        }
        s.current = d;
        s.clickNodeHandler(s.current);
        s.remove();
        s.draw();
        s.render();
    };
    s.moveLeaf = function (g, delta) {
        g.attr("transform", function (d) {
            d.angle += delta;
            var c = s.tools.l(s.children.cx, s.children.cy, s.children.r, d.angle);
            return s.tools.t(c.cx, c.cy);
        });
    };
    s.moveLeafByStep = function (g, delta) {
        var step = 25 / s.children.r;
        if (delta > step || delta < -step) {
            step = delta > 0 ? step : -step;
            var n = d3.round(delta / step);
            var i = 0;
            d3.timer(function () {
                s.moveLeaf(g, step);
                if (i++ >= n) {
                    s.moveLeaf(g, delta - n * step);
                    return true;
                }
            });
        } else {
            s.moveLeaf(g, delta);
        }
    };
    s.onmousewheel = function (g) {
        return function () {
            var delta = (d3.event.wheelDelta || -d3.event.detail) / 10 / 360 * 2 * Math.PI;
            s.moveLeafByStep(g, delta);
        };
    };
    s.childrenRotation = function () {
        var g = s.svg.selectAll("g.leaf");
        var startAngle = 0;
        var step = 2 * Math.PI / s.current.children.length;
        d3.select("svg." + s.options.className)
            .call(d3.behavior.drag()
                .on("dragstart", function () {
                    var e = d3.event.sourceEvent;
                    var x = e.x || e.touches[0].pageX;
                    var y = e.y || e.touches[0].pageY;
                    startAngle = s.tools.a(x, y);
                })
                .on("drag", function () {
                    var endAngle = s.tools.a(d3.event.x, d3.event.y);
                    var delta = endAngle - startAngle;
                    if (delta > Math.PI) delta = -(2 * Math.PI - delta);
                    else if (delta < -Math.PI) delta = 2 * Math.PI + delta;
                    s.moveLeafByStep(g, delta);
                    startAngle = endAngle;
                })
            )
            .on("mousewheel", s.onmousewheel(g))
            .on("DOMMouseScroll", s.onmousewheel(g));
    };
    s.attachEvents = function () {
        if (s.current.parent)
            s.svg.selectAll("g.parent").on("click", s.clickParent);
        if (s.current.children && s.current.children.length > 0) {
            s.svg.selectAll("g.leaf").on("click", s.clickLeaf);
            s.childrenRotation();
        }
    };
    s.remove = function () {
        s.svg.selectAll("g").remove();
    };
    s.draw = function () {
        s.width = s.container[0][0].clientWidth;
        s.height = s.container[0][0].clientHeight;
        d3.select("svg." + s.options.className)
            .style("width", (s.options.svgWidth || s.width) + "px")
            .style("height", s.height + "px");
        var n = s.current.children ? s.current.children.length : 0;
        s.tools.m(n);
        s.calc(n);
    };

    s.init = function () {
        s.draw();
        s.render();
    };
    s.onresizeTimeout = null;
    s.onresize = function () {
        if (s.onresizeTimeout) {
            clearTimeout(s.onresizeTimeout);
        }
        s.onresizeTimeout = setTimeout(function () {
            s.draw();
            s.svg.selectAll("g.line > line")
                .attr("x2", s.root.cx)
                .attr("y2", s.root.cy);
            s.svg.selectAll("g.children > circle")
                .attr("cx", s.children.cx)
                .attr("cy", s.children.cy)
                .attr("r", s.children.r);
            s.svg.selectAll("g.leaf")
                .attr("transform", function (d) {
                    var c = s.tools.l(s.children.cx, s.children.cy, s.children.r, d.angle);
                    return s.tools.t(c.cx, c.cy);
                });
            s.svg.selectAll("g.leaf > circle")
                .attr("r", s.leaf.r);
            s.svg.selectAll("g.root")
                .attr("transform", s.tools.t(s.root.cx, s.root.cy));
            s.svg.selectAll("g.root > circle")
                .attr("r", s.root.r);
            s.svg.selectAll("g.leaf > text.more")
                .attr("y", s.leaf.r);
            s.svg.selectAll("g.parent, g.root, g.leaf")
                .each(function (d) {
                    d3.select(this).select("text.title").remove();
                    d3.select(this).insert("text", "text.more")
                        .text(function (d) { return d.name; })
                        .attr("font-size", defaults.fontSize)
                        .attr("class", "title")
                        .attr("text-anchor", "middle")
                        .attr("fill", function (d) { return d.color || s.options.textColor; })
                        .each(function (d) {
                            d3plus.textwrap().container(d3.select(this)).valign("middle").draw();
                        });
                });
            s.onresizeTimeout = null;
        }, 100);
    };

    // TODO add you own method here:
    // refresh your data
    s.refreshData = function (children, parent, current) {
        // console.log("Map Refresh!");
        // TODO I don't know how to do
    }
    s.init();
    return s;
};