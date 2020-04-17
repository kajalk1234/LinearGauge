module powerbi.extensibility.visual {
    import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
    import valueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;
    import TextProperties = powerbi.extensibility.utils.formatting.TextProperties;
    import IValueFormatter = powerbi.extensibility.utils.formatting.IValueFormatter;
    import textMeasurementService = powerbi.extensibility.utils.formatting.textMeasurementService;
    import legend = powerbi.extensibility.utils.chart.legend;
    import createLegend = powerbi.extensibility.utils.chart.legend.createLegend;
    import positionChartArea = powerbi.extensibility.utils.chart.legend.positionChartArea;
    import LegendData = powerbi.extensibility.utils.chart.legend.LegendData;
    import ILegend = powerbi.extensibility.utils.chart.legend.ILegend;
    import LegendIcon = powerbi.extensibility.utils.chart.legend.LegendIcon;
    import LegendPosition = powerbi.extensibility.utils.chart.legend.LegendPosition;
    import TooltipEventArgs = powerbi.extensibility.utils.tooltip.TooltipEventArgs;
    import TooltipEnabledDataPoint = powerbi.extensibility.utils.tooltip.TooltipEnabledDataPoint;
    import createTooltipServiceWrapper = powerbi.extensibility.utils.tooltip.createTooltipServiceWrapper;
    import ITooltipServiceWrapper = powerbi.extensibility.utils.tooltip.ITooltipServiceWrapper;

    const rangeLiteral: string = `range s`;
    let legendData: LegendData;
    let categoryFlag: number = 0;
    let prevFlag: number = 0;
    let tooltipFLag: number = 0;
    let individualFlag: number = 0;
    let selectedKey: string = "";
    let tempSelectionId: powerbi.extensibility.ISelectionId = null;
    let uniqueValuesLegend: PrimitiveValue[];
    let dataPoints: IDataPoints[];
    let staticHost: IVisualHost;
    let legendLength: number = 0;
    let actualValue: number[] = [];
    let categoryLegend: ICategorySettings[];
    let linearDataPoint: ILinearDataPoint[];
    let tooltip: ITooltip[] = [];
    let tooltipPoint: ITooltipData[] = [];
    let showTrendStatus: boolean = true;
    let trendLabelFlag: boolean = false;
    let trendLabelHeight: number;
    let targetLabelHeight: number;
    const eighthLiteral: number = -8;
    const fourthLiteral: number = 4;
    const secondLiteral: number = 2;
    const nveTwo: number = -2;

    export interface ILinearGauge {
        states: number[];
        value: number;
        target: number;
        actual: number;
        scale: number[];
        min: number;
        minFlag: boolean;
        minColName: string;
        minFormat: string;
        max: number;
        maxFlag: boolean;
        maxColName: string;
        maxFormat: string;
        trendValueOne: number;
        trendValueTwo: number;
        actualFormat: string;
        scaleFormat: string;
        targetFormat: string;
        trend1Format: string;
        trend2Format: string;
        targetSet: boolean;
        trend1Exists: boolean;
        trend2Exists: boolean;
        actualExists: boolean;
        targetExists: boolean;
        actualColName: string;
        targetColName: string;
        trend1ColName: string;
        trend2ColName: string;
        best: number;
        bestSet: boolean;
        bestFormat: string;
        bestColName: string;
    }

    interface ITooltip {
        tooltipDataPoint: ITooltipData[];
    }

    interface ITooltipData {
        displayName: string;
        value: string;
    }

    interface ICategorySettings {
        key: string;
        color: string;
        selectionId: powerbi.visuals.ISelectionId;
    }

    interface IDataPoints {
        flag: number;
        key: string;
        selector: powerbi.visuals.ISelectionId;
    }

    interface ILinearDataPoint {
        key: string;
        targetValue: number;
        actualValue: number;
        minValue: number;
        maxValue: number;
        trendOne: number;
        trendTwo: number;
        BestValue: number;
        selectionId: powerbi.extensibility.ISelectionId;
    }

    export class LinearGauge implements IVisual {

        public static GETDEFAULTDATA(): ILinearGauge {
            return {
                actual: null,
                actualColName: "",
                actualExists: false,
                actualFormat: ``,
                best: null,
                bestColName: "",
                bestFormat: "",
                bestSet: false,
                max: null,
                maxColName: "",
                maxFlag: false,
                maxFormat: "",
                min: null,
                minColName: "",
                minFlag: false,
                minFormat: "",
                scale: [],
                scaleFormat: ``,
                states: [],
                target: null,
                targetColName: "",
                targetExists: false,
                targetFormat: ``,
                targetSet: false,
                trend1ColName: "",
                trend1Exists: false,
                trend1Format: ``,
                trend2ColName: "",
                trend2Exists: false,
                trend2Format: ``,
                trendValueOne: 0,
                trendValueTwo: 0,
                value: 0,
            };
        }

        public static GETDEFAULTDATAPOINT(): ILinearDataPoint {
            return {
                BestValue: 0,
                actualValue: 0,
                key: "",
                maxValue: 0,
                minValue: 0,
                selectionId: null,
                targetValue: 0,
                trendOne: 0,
                trendTwo: 0,
            };
        }

        private actualdecimalplaces: number = 0;
        private host: IVisualHost;
        private tooltipServiceWrapper: ITooltipServiceWrapper;
        private prevDataViewObjects: DataViewObjects = {};
        private settings: any;
        private svg: d3.Selection<SVGElement>;
        private rootElement: any;
        private svgLinear: d3.Selection<SVGElement>;
        private svgLinearNext: d3.Selection<SVGElement>;
        private actual: d3.Selection<SVGElement>;
        private percentage: d3.Selection<SVGElement>;
        private dataView: DataView;
        private maxValueIndex: number;
        private minValueFlag: boolean = false;
        private minValueIndex: number;
        private maxValueFlag: boolean = false;
        private data: ILinearGauge;
        private events: IVisualEventService;
        private trendValue1: d3.Selection<SVGElement>;
        private trendValue2: d3.Selection<SVGElement>;
        private bestLegend: d3.Selection<SVGElement>;
        private targetLegend: d3.Selection<SVGElement>;
        private colorsGlobal: string[];
        private legend: ILegend;
        private selectionManager: ISelectionManager;
        private roscCallFlag: boolean = false;
        private visualOptions: VisualUpdateOptions;

        constructor(options: VisualConstructorOptions) {
            this.events = options.host.eventService;
            this.host = options.host;
            staticHost = options.host;
            this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);
            this.legend = createLegend(options.element, false, null, true);
            this.selectionManager = options.host.createSelectionManager();
            this.selectionManager.registerOnSelectCallback(() => {
                this.roscCallFlag = true;
                this.update(this.visualOptions);
            });
            d3.select(options.element)
                .style({
                    cursor: "default"
                });
            this.rootElement = d3.select(options.element);
            this.svg = d3.select(options.element)
                .append(`div`)
                .classed(`lg_legend_tab`, true);
            this.targetLegend = this.svg
                .append(`div`)
                .classed(`lg_legend_target`, true);
            this.bestLegend = this.svg
                .append(`div`)
                .classed(`lg_legend_best`, true);
            this.svg = d3.select(options.element)
                .append(`div`)
                .classed(`lg_imagetab`, true);
            this.svgLinear = this.svg
                .append(`div`);
            this.svgLinearNext = this.svg
                .append(`div`);
            this.trendValue1 = this.svgLinear
                .append(`div`)
                .classed(`lg_trendvalue1`, true);
            this.trendValue2 = this.svgLinearNext
                .append(`div`)
                .classed(`lg_trendvalue2`, true);
            this.svg = d3.select(options.element)
                .append(`div`)
                .classed(`lg_data_tab`, true);
            this.actual = this.svg
                .append(`text`)
                .classed(`lg_data_total`, true)
                .text(``);
            this.percentage = this.svg
                .append(`text`)
                .classed(`lg_data_percentage`, true)
                .text(``);
            this.svg = d3.select(options.element)
                .append(`svg`)
                .classed(`linearSVG`, true);
            this.svgLinear = this.svg
                .append(`g`)
                .classed("lg_visual", true);
        }

        public getDataViewValue(dataView: DataView, options: VisualUpdateOptions) {
            const selectedArray: powerbi.extensibility.ISelectionId[] = this.selectionManager.getSelectionIds();
            for (let step: number = 0; step < dataView.categorical.values[0].values.length; step++) {
                let tempKey: string = "", tempActual: number = null;
                let tempTarget: number = null, tempMin: number = null;
                let tempMax: number = null, temptrendOne: number = null;
                let temptrendtwo: number = null, tempBest: number = null;
                tooltipPoint = [];
                if (categoryFlag === 1) {
                    if (dataView.categorical.categories[0].values[step] === null || dataView.categorical.categories[0].values[step] === "") {
                        dataView.categorical.categories[0].values[step] = "(Blank)";
                    }
                    tempKey = <string>dataView.categorical.categories[0].values[step];
                    tooltipPoint.push({ displayName: options.dataViews[0].categorical.categories[0].source.displayName, value: tempKey });
                }
                for (let iterator: number = 0; iterator < dataView.categorical.values.length; iterator++) {
                    let col: DataViewMetadataColumn = dataView.categorical.values[iterator].source;
                    if (dataView.categorical.values[iterator].values[step] === null) {
                        dataView.categorical.values[iterator].values[step] = 0;
                    }
                    if (col.roles[`Y`]) {
                        tempActual = <number>dataView.categorical.values[iterator].values[step];
                        tooltipPoint.push({ displayName: col.displayName, value: this.getFormattedTooltipData(col.format, tempActual) });
                    } else if (col.roles[`TargetValue`]) {
                        tempTarget = <number>dataView.categorical.values[iterator].values[step];
                        tooltipPoint.push({ displayName: col.displayName, value: this.getFormattedTooltipData(col.format, tempTarget) });
                    } else if (col.roles[`MinValue`]) {
                        this.minValueIndex = iterator;
                        this.minValueFlag = true;
                        tempMin = <number>dataView.categorical.values[iterator].values[step];
                        tooltipPoint.push({ displayName: col.displayName, value: this.getFormattedTooltipData(col.format, tempMin) });
                    } else if (col.roles[`MaxValue`]) {
                        this.maxValueIndex = iterator;
                        this.maxValueFlag = true;
                        tempMax = <number>dataView.categorical.values[iterator].values[step];
                        tooltipPoint.push({ displayName: col.displayName, value: this.getFormattedTooltipData(col.format, tempMax) });
                    } else if (col.roles[`QualitativeState1Value`]) {
                        temptrendOne = <number>dataView.categorical.values[iterator].values[step];
                        tooltipPoint.push({ displayName: col.displayName, value: this.getFormattedTooltipData(col.format, temptrendOne) });
                    } else if (col.roles[`QualitativeState2Value`]) {
                        temptrendtwo = <number>dataView.categorical.values[iterator].values[step];
                        tooltipPoint.push({ displayName: col.displayName, value: this.getFormattedTooltipData(col.format, temptrendtwo) });
                    } else if (col.roles[`BestValue`]) {
                        tempBest = <number>dataView.categorical.values[iterator].values[step];
                        tooltipPoint.push({ displayName: col.displayName, value: this.getFormattedTooltipData(col.format, tempBest) });
                    }
                }
                let dataPoint: ILinearDataPoint = {
                    BestValue: tempBest,
                    actualValue: tempActual,
                    key: tempKey,
                    maxValue: tempMax,
                    minValue: tempMin,
                    selectionId: categoryFlag === 1 ? staticHost.createSelectionIdBuilder()
                        .withCategory(dataView.categorical.categories[0], step).createSelectionId() : null,
                    targetValue: tempTarget,
                    trendOne: temptrendOne,
                    trendTwo: temptrendtwo,
                };
                if (this.roscCallFlag) {
                    if ((selectedArray.length) && (selectedArray[0][`key`] === dataPoint.selectionId[`key`])) {
                        tempSelectionId = dataPoint.selectionId;
                    } else if (!selectedArray.length) {
                        tempSelectionId = null;
                    }
                }
                linearDataPoint.push(dataPoint);
                if (tempSelectionId !== null && prevFlag === options.dataViews[0].categorical.categories[0].values.length) {
                    if (linearDataPoint[step].selectionId[`key`] === tempSelectionId[`key`]) {
                        tooltip.push({ tooltipDataPoint: tooltipPoint });
                        tooltipFLag = 1;
                    }
                } else {
                    tooltip.push({ tooltipDataPoint: tooltipPoint });
                }
            }
        }

        private animation(dataView: DataView, $this: this, options: VisualUpdateOptions) {
            if (categoryFlag === 1) {
                let categoryCol: string = dataView.categorical.categories[0].source.displayName;
                let length: number = linearDataPoint.length;
                for (let index: number = 0; index < length; index++) {
                    let category: PrimitiveValue = linearDataPoint[index].key;
                    categoryLegend.push({
                        color: getCategoricalObjectValue<Fill>(dataView.categorical.categories[0], index, `colors`, "fillColor", {
                            solid: { color: staticHost.colorPalette.getColor(<string>dataView.categorical.categories[0].values[index]).value }
                        }).solid.color,
                        key: category.toString(),
                        selectionId: staticHost.createSelectionIdBuilder().withCategory(dataView.categorical.categories[0], index).createSelectionId()
                    });
                    dataPoints.push({
                        flag: index + 1, key: category.toString(),
                        selector: staticHost.createSelectionIdBuilder()
                            .withCategory(dataView.categorical.categories[0], index)
                            .createSelectionId()
                    });
                }
                uniqueValuesLegend = dataView.categorical.categories[0].values.filter((e: PrimitiveValue, i: number, arr: PrimitiveValue[]): boolean => {
                    return arr.lastIndexOf(e) === i;
                });
                categoryFlag = 1;
                legendData = {
                    dataPoints: [],
                    fontSize: $this.settings.categoryFontSize,
                    labelColor: $this.settings.legendTextColor,
                    title: $this.settings.categoryTitle ? dataView.categorical.categories[0].source.displayName ? categoryCol : "NULL" : ""
                };
                const cache: number = 20;
                options.viewport.width = options.viewport.width - cache;
                for (let index: number = 0; index < uniqueValuesLegend.length; index++) {
                    legendData.dataPoints.push({
                        color: staticHost.colorPalette.getColor(<string>dataView.categorical.categories[0].values[index]).value,
                        icon: powerbi.extensibility.utils.chart.legend.LegendIcon.Box,
                        identity: linearDataPoint[index].selectionId,
                        label: linearDataPoint[index].key,
                        selected: false
                    });
                }
                for (let index: number = 0; index < categoryLegend.length; index++) {
                    if (categoryLegend[index].key === legendData.dataPoints[index].label) {
                        legendData.dataPoints[index].color = categoryLegend[index].color;
                    }
                }
                if (this.settings.legendPos === "Top") {
                    this.legend.changeOrientation(LegendPosition.Top);
                } else if (this.settings.legendPos === "Top center") {
                    this.legend.changeOrientation(LegendPosition.TopCenter);
                } else if (this.settings.legendPos === "Bottom") {
                    this.legend.changeOrientation(LegendPosition.Bottom);
                } else if (this.settings.legendPos === "Bottom center") {
                    this.legend.changeOrientation(LegendPosition.BottomCenter);
                } else if (this.settings.legendPos === "Left center") {
                    this.legend.changeOrientation(LegendPosition.LeftCenter);
                } else if (this.settings.legendPos === "Right") {
                    this.legend.changeOrientation(LegendPosition.Right);
                } else if (this.settings.legendPos === "Right center") {
                    this.legend.changeOrientation(LegendPosition.RightCenter);
                } else {
                    this.legend.changeOrientation(LegendPosition.Left);
                }
                this.legend.drawLegend(legendData, options.viewport);
                legendLength = legendData.dataPoints.length;
                options.viewport.width = options.viewport.width + cache;
            }
        }

        private datamaxFlag(data, actualFlag) {
            if ((!data.maxFlag && actualFlag) || data.max < data.actual) {
                if (data.actual > 0) {
                    data.max = data.actual * secondLiteral;
                } else if (data.actual < 0) {
                    data.max = data.actual / secondLiteral;
                }
            }
            return data.max;
        }

        private renderAnimation($this: this, options: VisualUpdateOptions, data: ILinearGauge, actualFlag: boolean) {
            if (categoryFlag === 1) {
                let legendItem_selectAll = d3.selectAll(".legendItem");
                d3.selectAll(".measure").data(legendData.dataPoints);
                legendItem_selectAll.on("click", function (d: any, i: number): void {
                    if (d3.select(this).classed("selected")) {
                        $this.selectionManager.clear();
                        if (tempSelectionId !== null) {
                            tempSelectionId = null;
                            $this.roscCallFlag = false;
                            $this.update(options);
                        }
                        legendItem_selectAll.classed("selected", false);
                        legendItem_selectAll.style("opacity", 1);
                    } else {
                        $this.selectionManager.select(d.identity).then((ids: ISelectionId[]) => {
                            tempSelectionId = d.identity;
                            $this.roscCallFlag = false;
                            $this.update(options);
                            d3.select(this).classed("selected", true);
                            legendItem_selectAll.style("opacity", 0.5);
                            d3.select(this).style("opacity", 1);
                        });
                    }
                    (<Event>d3.event).stopPropagation();
                });
                $(".navArrow").click((): void => {
                    legendItem_selectAll.style("cursor", "pointer");
                    legendItem_selectAll.on("click", function (d: any, i: number): void {
                        if (d3.select(this).classed("selected")) {
                            $this.selectionManager.clear();
                            if (tempSelectionId !== null) {
                                tempSelectionId = null;
                                $this.roscCallFlag = false;
                                $this.update(options);
                            }
                            legendItem_selectAll.classed("selected", false);
                            legendItem_selectAll.style("opacity", 1);
                        } else {
                            $this.selectionManager.select(d.identity).then((ids: ISelectionId[]) => {
                                tempSelectionId = d.identity;
                                $this.roscCallFlag = false;
                                $this.update(options);
                                d3.select(this).classed("selected", true);
                                legendItem_selectAll.style("opacity", 0.5);
                                d3.select(this).style("opacity", 1);
                            });
                        }
                        (<Event>d3.event).stopPropagation();
                    });
                });
                d3.select("html").on("click", (): void => {
                    $this.selectionManager.clear();
                    if (tempSelectionId !== null) {
                        tempSelectionId = null;
                        $this.roscCallFlag = false;
                        $this.update(options);
                        legendItem_selectAll.style("opacity", 1);
                    }
                });
            }
            if (this.settings.Orientation === "Vertical" && (this.settings.legendPos === "Bottom" || this.settings.legendPos === "Bottom center")) {
                d3.select("svg.legend").style("bottom", "0px");
            }
            if (this.settings.Orientation === "Vertical" && (this.settings.legendPos === "Top" || this.settings.legendPos === "Top center")) {
                d3.select("svg.legend").style("top", "0px");
            }
            data.max = this.datamaxFlag(data, actualFlag);
            if ((!data.minFlag && actualFlag) || data.min > data.actual) {
                if (data.actual > 0) {
                    data.min = data.actual / secondLiteral;
                } else if (data.actual < 0) {
                    data.min = data.actual * secondLiteral;
                }
            }
            if (data.targetExists && data.target < data.min && !data.minFlag && actualFlag) {
                data.min = data.target;
            }
            if (data.targetExists && data.target > data.max && !data.maxFlag && actualFlag) {
                data.max = data.target;
            }
            if (data.bestSet && data.best < data.min && !data.minFlag && actualFlag) {
                data.min = data.best;
            }
            if (data.bestSet && data.best > data.max && !data.maxFlag && actualFlag) {
                data.max = data.best;
            }
            if (data.min >= data.max) {
                if (data.actual > 0) {
                    data.min = data.actual / secondLiteral;
                    data.max = data.actual * secondLiteral;
                } else if (data.actual < 0) {
                    data.min = data.actual * secondLiteral;
                    data.max = data.actual / secondLiteral;
                }
            }
        }

        public converter(dataView: DataView, options: VisualUpdateOptions): ILinearGauge {
            let $this: this = this;
            tooltipFLag = 0;
            let data: ILinearGauge = LinearGauge.GETDEFAULTDATA();
            linearDataPoint = [];
            $this.getSettings(this.dataView.metadata.objects);
            dataPoints = [];
            if (!dataView || !dataView.categorical || dataView.categorical.values === undefined) {
                return;
            }
            let actualFlag: boolean = false;
            let values: DataViewValueColumns = dataView.categorical.values;
            if (dataView.categorical.categories) {
                categoryFlag = 1;
            }
            else {
                categoryFlag = 0;
            }
            tooltip = [];
            const selectedArray: powerbi.extensibility.ISelectionId[] = $this.selectionManager.getSelectionIds();
            if (dataView.categorical.values[0].values.length === 0 && dataView.categorical.categories[0].values.length === 0) {
                this.nullValueError();
            }
            this.getDataViewValue(dataView, options);
            if (selectedArray.length) {
                tempSelectionId = selectedArray[0];
            }
            this.animation(dataView, $this, options);
            actualValue = [];
            for (let i: number = 0; i < values.length; i++) {
                let col: DataViewMetadataColumn = dataView.categorical.values[i].source;
                let value: number = null, pos: number = 0;
                this.colRolesUpdate(col, data, value, pos, actualFlag, values, i);
            }
            this.renderAnimation($this, options, data, actualFlag);
            return data;
        }

        public colRolesEqualsY(data, col, value, pos, actualFlag) {
            data.actualFormat = col.format;
            for (let j: number = 0; j < linearDataPoint.length; j++) {
                if (tempSelectionId !== null && linearDataPoint[j].selectionId[`key`] === tempSelectionId[`key`]) {
                    value = <number>value + linearDataPoint[j].actualValue;
                    selectedKey = linearDataPoint[j].key;
                    if (individualFlag === 0) {
                        actualValue[pos] = value; pos++;
                    }
                } else if (tempSelectionId === null) {
                    value = <number>value + linearDataPoint[j].actualValue;
                    if (individualFlag === 0) {
                        actualValue[j] = value;
                    }
                }
            }
            data.actual = value;
            actualFlag = true;
            data.actualExists = true;
            data.actualColName = col.displayName;
        }

        public colRolesUpdate(col, data, value, pos, actualFlag, values, i) {
            if (col.roles[`Y`]) {
                this.colRolesEqualsY(data, col, value, pos, actualFlag);
            }
            if (col.roles[`MinValue`]) {
                data.minFlag = true; value = <number>values[i].values[0];
                for (const j of linearDataPoint) {
                    const linearValue: number = <number>j.minValue;
                    if (tempSelectionId !== null && j.selectionId[`key`] === tempSelectionId[`key`]) {
                        value = <number>j.minValue;
                    } else if (tempSelectionId === null && value > linearValue) {
                        value = <number>j.minValue;
                    }
                }
                data.min = value;
                data.minColName = col.displayName;
                data.minFormat = col.format;
            }
            if (col.roles[`MaxValue`]) {
                data.maxFlag = true;
                value = null;
                for (const j of linearDataPoint) {
                    if (tempSelectionId !== null && j.selectionId[`key`] === tempSelectionId[`key`]) {
                        value = <number>j.maxValue;
                    } else if (tempSelectionId === null) {
                        value = <number>value + j.maxValue;
                    }
                }
                data.max = value;
                data.maxColName = col.displayName;
                data.maxFormat = col.format;
            }
            if (col.roles[`TargetValue`]) {
                data.targetSet = true;
                data.targetFormat = col.format;
                value = null;
                for (const j of linearDataPoint) {
                    if (tempSelectionId !== null && j.selectionId[`key`] === tempSelectionId[`key`]) {
                        value = <number>j.targetValue;
                    }
                    else if (tempSelectionId === null) {
                        value = <number>value + j.targetValue;
                    }
                }
                data.target = value;
                data.targetExists = true;
                data.targetColName = col.displayName;
            }
            if (col.roles[`QualitativeState1Value`]) {
                value = null;
                for (const j of linearDataPoint) {
                    if (tempSelectionId !== null && j.selectionId[`key`] === tempSelectionId[`key`]) {
                        value = <number>j.trendOne;
                    } else if (tempSelectionId === null) {
                        value = <number>value + j.trendOne;
                    }
                }
                data.trendValueOne = value;
                data.trend1Format = col.format;
                data.trend1Exists = true;
                data.trend1ColName = col.displayName;
            }
            if (col.roles[`QualitativeState2Value`]) {
                value = null;
                for (const j of linearDataPoint) {
                    if (tempSelectionId !== null && j.selectionId[`key`] === tempSelectionId[`key`]) {
                        value = <number>j.trendTwo;
                    } else if (tempSelectionId === null) {
                        value = <number>value + j.trendTwo;
                    }
                }
                data.trendValueTwo = value;
                data.trend2Format = col.format;
                data.trend2Exists = true;
                data.trend2ColName = col.displayName;
            }
            if (col.roles[`BestValue`]) {
                value = null;
                for (const j of linearDataPoint) {
                    if (tempSelectionId !== null && j.selectionId[`key`] === tempSelectionId[`key`]) {
                        value = <number>j.BestValue;
                    } else if (tempSelectionId === null) {
                        value = <number>value + j.BestValue;
                    }
                }
                data.best = value;
                data.bestFormat = col.format;
                data.bestSet = true;
                data.bestColName = col.displayName;
            }
        }

        public nullValueError() {
            const message: string = " Actual value shouldn't be null or 0 ";
            this.rootElement
                .append("div")
                .classed("lg_ErrorMessage", true)
                .text(message)
                .attr("title", message);

            return;
        }

        public getDarkShade(colorHEX: string, opacity: number): string {
            colorHEX = String(colorHEX).replace(/[^0-9a-f]/gi, "");
            if (colorHEX.length < 6) {
                colorHEX = colorHEX[0] + colorHEX[0] + colorHEX[1] + colorHEX[1] + colorHEX[2] + colorHEX[2];
            }
            opacity = opacity || 0;
            let rgb: string = "#";
            let c: any;
            for (let iCounter: number = 0; iCounter < 3; iCounter++) {
                c = parseInt(colorHEX.substr(iCounter * 2, 2), 16);
                c = Math.round(Math.min(Math.max(0, c + (c * opacity)), 255)).toString(16);
                rgb += (`00${c}`).substr(c.length);
            }

            return rgb;
        }

        public getSettings(objects: DataViewObjects): void {
            this.colorsGlobal = [];
            if ((JSON.stringify(objects) !== JSON.stringify(this.prevDataViewObjects))) {
                const colorPalette: IColorPalette = this.host.colorPalette;
                const minValue: number = getValue<number>(objects, `TargetRange`, `MinRangeValue`, null);
                const maxValue: number = getValue<number>(objects, `TargetRange`, `MaxRangeValue`, null);
                const range1Val: number = getValue<number>(objects, `colorSelector`, `range1`, null);
                const range2Val: number = getValue<number>(objects, `colorSelector`, `range2`, null);
                const range3Val: number = getValue<number>(objects, `colorSelector`, `range3`, null);
                const range4Val: number = getValue<number>(objects, `colorSelector`, `range4`, null);
                const percentageVal1: number = getValue<number>(objects, `colorSelector`, `percentage1`, 20);
                const percentageVal2: number = getValue<number>(objects, `colorSelector`, `percentage2`, 60);
                const percentageVal3: number = getValue<number>(objects, `colorSelector`, `percentage3`, 20);
                let dataDecimal: number = getValue<number>(objects, `labels`, `markerWidth`, null);
                let trendDecimal: number = getValue<number>(objects, `trendLabels`, `lineWidth`, null);
                let scaleDecimalPlaces: number = getValue<number>(objects, `ScaleSettings`, `decimalPlaces`, null);
                let legendDecimalPlaces: number = getValue<number>(objects, `legendSettings`, `decimalPlaces`, null);
                this.actualdecimalplaces = getValue<number>(objects, `labels`, `markerWidth`, null);
                dataDecimal = dataDecimal === null ? null : dataDecimal <= 0 ? null : (dataDecimal <= fourthLiteral) ? dataDecimal : fourthLiteral;
                trendDecimal = trendDecimal === null ? null : trendDecimal <= 0 ? null : (trendDecimal <= fourthLiteral) ? trendDecimal : fourthLiteral;
                scaleDecimalPlaces = scaleDecimalPlaces === null ? null : scaleDecimalPlaces <= 0 ? null : (scaleDecimalPlaces <= fourthLiteral) ? scaleDecimalPlaces : fourthLiteral;
                legendDecimalPlaces = legendDecimalPlaces === null ? null : legendDecimalPlaces <= 0 ? null : (legendDecimalPlaces <= fourthLiteral) ? legendDecimalPlaces : fourthLiteral;
                this.settings = {
                    ActualFillColor: getValue<Fill>(objects, `general`, `ActualFillColor`, { solid: { color: `#FF8F00` } }).solid.color,
                    ActualFillColorEqual: getValue<Fill>(objects, `general`, `ActualFillColorEqual`, { solid: { color: `#FD817E` } }).solid.color,
                    ActualFillColorGreater: getValue<Fill>(objects, `general`, `ActualFillColorGreater`, { solid: { color: `#8AD4EB` } }).solid.color,
                    ComparisonFillColor: getValue<Fill>(objects, `general`, `ComparisonFillColor`, { solid: { color: "#E0E0E0" } }).solid.color,
                    DataColor: getValue<Fill>(objects, `labels`, `DataColor`, { solid: { color: "#000" } }).solid.color,
                    Indicator1: getValue<Fill>(objects, `Indicator`, `Indicator1`, { solid: { color: "grey" } }).solid.color,
                    Indicator2: getValue<Fill>(objects, `Indicator`, `Indicator2`, { solid: { color: "grey" } }).solid.color,
                    MaxRangeValue: maxValue, MinRangeValue: minValue,
                    Orientation: getValue<number>(objects, `ChartOrientation`, `Orientation`, 0) <= 0 ? `Horizontal` : getValue<number>(objects, `ChartOrientation`, `Orientation`, 0),
                    PercentageDataColor: getValue<Fill>(objects, `PercentageDatalabels`, `PercentageDataColor`, { solid: { color: "#000" } }).solid.color,
                    RangeTicksColor: getValue<Fill>(objects, `TargetRange`, `RangeTicksColor`, { solid: { color: "#FD625E" } }).solid.color,
                    Zone1: getValue<Fill>(objects, `colorSelector`, `Zone1`, { solid: { color: "#01B8AA" } }).solid.color,
                    Zone2: getValue<Fill>(objects, `colorSelector`, `Zone2`, { solid: { color: "#0051FF" } }).solid.color,
                    Zone3: getValue<Fill>(objects, `colorSelector`, `Zone3`, { solid: { color: "#7FBA00" } }).solid.color,
                    Zone4: getValue<Fill>(objects, `colorSelector`, `Zone4`, { solid: { color: "#F9B700" } }).solid.color,
                    animationTime: getValue<number>(objects, `animationEffect`, `animationTime`, 3),
                    animationToggle: getValue<boolean>(objects, `animationEffect`, `show`, false),
                    area1: getValue<Fill>(objects, `colorSelector`, `area1`, { solid: { color: "#01B8AA" } }).solid.color,
                    area2: getValue<Fill>(objects, `colorSelector`, `area2`, { solid: { color: "#0051FF" } }).solid.color,
                    area3: getValue<Fill>(objects, `colorSelector`, `area3`, { solid: { color: "#7FBA00" } }).solid.color,
                    categoryFontSize: getValue<number>(objects, `categorySettings`, `fontSize`, 12),
                    categoryTitle: getValue<boolean>(objects, `categorySettings`, `title`, false),
                    fillOption: getValue<string>(objects, `colorSelector`, `fillOption`, `value`),
                    colorOption: getValue<string>(objects, `colorSelector`, `colorOption`, `solidcolor`),
                    fontFamily: getValue<number>(objects, `labels`, `fontFamily`, 0) <= 0 ? `Segoe UI` : getValue<number>(objects, `labels`, `fontFamily`, 0),
                    fontSize: getValue<number>(objects, `labels`, `fontSize`, 0) <= 0 ? 25 : getValue<number>(objects, `labels`, `fontSize`, 0),
                    labelDisplayUnits: getValue<number>(objects, `labels`, `labelDisplayUnits`, 0),
                    legendColor: getValue<Fill>(objects, `legendSettings`, `fill`, { solid: { color: "#000" } }).solid.color,
                    legendDecimalPlaces, legendDisplayUnits: getValue<number>(objects, `legendSettings`, `displayUnits`, 0),
                    legendFontFamily: getValue<string>(objects, `legendSettings`, `fontFamily`, "Segoe UI"),
                    legendFontSize: getValue<number>(objects, `legendSettings`, `fontSize`, 15),
                    legendNewPosition: getValue<string>(objects, `legendSettings`, `position`, "topLeft"),
                    legendPos: getValue<string>(objects, "categorySettings", "position", "Bottom center"),
                    legendShow: getValue<boolean>(objects, `legendSettings`, `show`, true),
                    legendTextColor: getValue<Fill>(objects, `categorySettings`, `color`, { solid: { color: "black" } }).solid.color,
                    lineWidth: trendDecimal, markerWidth: dataDecimal,
                    percentageVal1: Number(percentageVal1),
                    percentageVal2: Number(percentageVal2),
                    percentageVal3: Number(percentageVal3),
                    percentagefontFamily: getValue<number>(objects, `PercentageDatalabels`, `fontFamily`, 0) <= 0 ? `Segoe UI` :
                        getValue<number>(objects, `PercentageDatalabels`, `fontFamily`, 0),
                    percentagefontSize: getValue<number>(objects, `PercentageDatalabels`, `fontSize`, 0) <= 0 ? 15 : getValue<number>(objects, `PercentageDatalabels`, `fontSize`, 0),
                    range1: range1Val, range2: range2Val, range3: range3Val, range4: range4Val,
                    rangeStyle: getValue<string>(objects, `TargetRange`, `rangeStyle`, "solid"),
                    rangeWidth: getValue<number>(objects, `TargetRange`, `rangeWidth`, 3) <= 0 ? 1 : getValue<number>(objects, `TargetRange`, `rangeWidth`, 3),
                    scaleColor: getValue<Fill>(objects, `ScaleSettings`, `color`, { solid: { color: "#000000" } }).solid.color,
                    scaleDecimalPlaces,
                    scaleDisplayUnits: getValue<number>(objects, `ScaleSettings`, `displayUnits`, 0),
                    scaleFontFamily: getValue<string>(objects, `ScaleSettings`, `fontFamily`, "Segoe UI"),
                    scaleFontSize: getValue<number>(objects, `ScaleSettings`, `fontSize`, 9),
                    showColor: getValue<number>(objects, `colorSelector`, `show`, 0) <= 0 ? false : getValue<number>(objects, `colorSelector`, `show`, 0),
                    showPercentage: getValue<number>(objects, `PercentageDatalabels`, `show`, 0) === 0 ? true : getValue<number>(objects, `PercentageDatalabels`, `show`, 0),
                    showRange: getValue<number>(objects, `TargetRange`, `show`, 0) <= 0 ? false : getValue<number>(objects, `TargetRange`, `show`, 0),
                    showRemainingPercentage: getValue<boolean>(objects, `PercentageDatalabels`, `showRemaining`, false),
                    showScale: getValue<number>(objects, `ScaleSettings`, `show`, 0) === 0 ? true : getValue<number>(objects, `ScaleSettings`, `show`, 0),
                    showTrend: getValue<number>(objects, `trendLabels`, `show`, 0) === 0 ? true : getValue<number>(objects, `trendLabels`, `show`, 0),
                    showlabel: getValue<number>(objects, `labels`, `show`, 0) === 0 ? true : getValue<number>(objects, `labels`, `show`, 0),
                    title: getValue<boolean>(objects, `general`, `title`, false),
                    trendColor: getValue<Fill>(objects, `trendLabels`, `trendColor`, { solid: { color: "#000" } }).solid.color,
                    trendDisplayUnits: getValue<number>(objects, `trendLabels`, `trendDisplayUnits`, 0),
                    trendfontFamily: getValue<number>(objects, `trendLabels`, `fontFamily`, 0) <= 0 ? `Segoe UI` : getValue<number>(objects, `trendLabels`, `fontFamily`, 0),
                    trendfontSize: getValue<number>(objects, `trendLabels`, `fontSize`, 0) <= 0 ? 15 : getValue<number>(objects, `trendLabels`, `fontSize`, 0)
                };
                this.settings.scaleFontSize = this.scaleFontSize();
                this.settings.legendFontSize = this.legendFontSize();
                if (this.settings.fontSize > 40) {
                    this.settings.fontSize = 40;
                }
                if (this.settings.percentagefontSize > 40) {
                    this.settings.percentagefontSize = 40
                }
            }
            this.prevDataViewObjects = objects;
            this.colorsGlobal.push(this.settings.ComparisonFillColor);
            this.colorsGlobal = this.settingsFillOption();
        }

        public legendFontSize() {
            if (this.settings.legendFontSize > 25) {
                this.settings.legendFontSize = 25;
            }
            return this.settings.legendFontSize;
        }

        public scaleFontSize() {
            if (this.settings.scaleFontSize > 28) {
                this.settings.scaleFontSize = 28;
            }
            return this.settings.scaleFontSize;
        }

        public settingsFillOption() {
            if (this.settings.fillOption === `value`) {
                this.colorsGlobal.push(this.settings.Zone4);
                this.colorsGlobal.push(this.settings.Zone3);
                this.colorsGlobal.push(this.settings.Zone2);
                this.colorsGlobal.push(this.settings.Zone1);
            }
            else {
                this.colorsGlobal.push(this.settings.area3);
                this.colorsGlobal.push(this.settings.area2);
                this.colorsGlobal.push(this.settings.area1);
            }
            return this.colorsGlobal;
        }

        public isInteger(x: number): boolean {
            return x % 1 === 0;
        }

        public removeAllClasses() {
            d3.selectAll(".gradientSVG").remove();
            d3.selectAll(".markerTriangle").remove();
            this.rootElement.selectAll(`.lg_ErrorMessage`).remove();
            this.svg.selectAll(`.linearSVG`).remove();
            this.svgLinear.selectAll(`rect.range`).remove();
            this.svgLinear.selectAll(`rect.rectRange`).remove();
            this.svgLinear.selectAll(`rect.measure`).remove();
            this.svg.selectAll(".lg_xLabels,.lg_yLabels").remove();
            this.svgLinear.selectAll(`line.marker, line.markerTilt`).remove();
            this.svgLinear.selectAll(`line.markermax, line.markermin`).remove();
            d3.selectAll(".LG_verticalDataLabel").remove();
            $(".lg_data_total").hide();
            $(".lg_data_percentage").hide();
            $(".lg_trendvalue1,.lg_trendvalue2").hide();
        }

        public removeSvgMarker() {
            this.svgLinear.selectAll(`line.marker`).remove();
            this.svgLinear.selectAll(`line.bestMarker`).remove();
            this.svgLinear.selectAll(`line.markermin`).remove();
            this.svgLinear.selectAll(`line.markermax`).remove();
        }

        private showscale(translateVal: string, axisFunction: d3.svg.Axis, className: string, height: number, $this: this,
            axisFormatter: IValueFormatter, options: VisualUpdateOptions, halfMaxFormattedDataWidth: number, viewport: IViewport) {
            let markings: d3.Selection<SVGElement> = this.svg.append("g").classed(`${className}`, true);
            markings.attr(`transform`, translateVal)
                .style({
                    "fill": this.settings.scaleColor,
                    "font-family": `${this.settings.scaleFontFamily}`,
                    "font-size": `${this.settings.scaleFontSize}px`,
                    "stroke": `none`
                }).call(axisFunction);
            d3.selectAll("g.tick title").remove();
            const THIS: this = this;
            d3.selectAll("g.tick").append("title")
                .text((d: number): string => {
                    return THIS.getFormattedTooltipData(THIS.data.actualFormat, d);
                });
            if (height) {
                markings.selectAll(`path,line`).style({
                    fill: `none`,
                    stroke: this.settings.scaleColor
                });
            }
            if (this.settings.Orientation === "Horizontal") {
                let totalTicks: number = d3.selectAll(".lg_xLabels g.tick text")[0].length;
                d3.selectAll(".lg_xLabels g.tick text")
                    .text((d: string): string => {
                        const tickProperty: TextProperties = {
                            fontFamily: `${$this.settings.scaleFontFamily}`,
                            fontSize: `${$this.settings.scaleFontSize}px`,
                            text: axisFormatter.format(d)
                        };
                        const tickAvailWidth: number = textMeasurementService.measureSvgTextWidth(tickProperty) + 1;
                        return textMeasurementService.
                            getTailoredTextOrDefault(tickProperty, (options.viewport.width -
                                halfMaxFormattedDataWidth) / totalTicks);
                    });
                const ticks: JQuery = $(".lg_xLabels g.tick");
                const domPositionTick1: ClientRect = ticks[0].getBoundingClientRect();
                const tickLen: number = !!d3.selectAll(".lg_xLabels g.tick") ? d3.selectAll(".lg_xLabels g.tick")[0].length : 1;
                const domPositionTick2: ClientRect = ticks[tickLen - 1].getBoundingClientRect();
                const precede: boolean = !(domPositionTick1.right < domPositionTick2.left);
                if (precede) {
                    this.svg.selectAll(".lg_xLabels").remove();
                    this.svg.selectAll(".marker, .markermax, .markermin, .bestMarker, .markerTilt").remove();
                }
            } else {
                let totalTicks: number = d3.selectAll(".lg_yLabels g.tick text")[0].length;
                d3.selectAll(".lg_yLabels g.tick text")
                    .text((d: string): string => {
                        const tickProperties: TextProperties = {
                            fontFamily: `${$this.settings.scaleFontFamily}`,
                            fontSize: `${$this.settings.scaleFontSize}px`,
                            text: axisFormatter.format(d)
                        };
                        const tickAvailWidth: number = textMeasurementService.measureSvgTextWidth(tickProperties) + 1;
                        return textMeasurementService.
                            getTailoredTextOrDefault(tickProperties, (options.viewport.width -
                                halfMaxFormattedDataWidth) / totalTicks);
                    });
                const tickLen: number = !!d3.selectAll(".lg_yLabels g.tick") ? d3.selectAll(".lg_yLabels g.tick")[0].length : 1;
                if ($(".tick")[tickLen - 1].getBoundingClientRect().right > viewport.width) {
                    this.svg.selectAll(".lg_yLabels").remove();
                    this.svgLinear.selectAll(`line.markerTilt`).remove();
                }
                const ticks: JQuery = $(".lg_yLabels g.tick");
                const domPositionTick1: ClientRect = ticks[0].getBoundingClientRect();
                const domPositionTick2: ClientRect = ticks[1].getBoundingClientRect();
                const overlap: boolean = !(domPositionTick1.right < domPositionTick2.left ||
                    domPositionTick1.left > domPositionTick2.right ||
                    domPositionTick1.bottom < domPositionTick2.top ||
                    domPositionTick1.top > domPositionTick2.bottom);
                if (overlap) {
                    this.svg.selectAll(".lg_yLabels").remove();
                }
            }
        }
        private showtrend(trend1Val: string, options: VisualUpdateOptions, availablewidth: number, upArrow: string, percentageFontTrend: number,
            trend2Val: string, className: string, translateVal: string, axisFunction: d3.svg.Axis, height: number, $this: this, axisFormatter: IValueFormatter,
            halfMaxFormattedDataWidth: number, viewport: IViewport) {
            if (this.settings.showTrend) {
                let updatedText1: string;
                let updatedText2: string;
                const arrowColorI1: string = this.settings.Indicator1;
                const arrowColorI2: string = this.settings.Indicator2;
                if (this.data.trend1Exists) {
                    const trend1ValText: string = this.data.trend1ColName;
                    const textProps1: TextProperties = {
                        fontFamily: this.settings.trendfontFamily,
                        fontSize: `${this.settings.trendfontSize}px`,
                        text: `${trend1Val} ${trend1ValText}`
                    };
                    if (this.settings.Orientation === "Horizontal") {
                        updatedText1 = textMeasurementService.
                            getTailoredTextOrDefault(textProps1, (options.viewport.width / 2.1) - 20);
                    } else { updatedText1 = textMeasurementService.getTailoredTextOrDefault(textProps1, availablewidth * 0.8); }
                    this.trendValue1.style(`display`, `inline`);
                    this.trendValue1.select(`span.trendvalue1arrow`).remove();
                    this.trendValue1.select(`span`).remove();
                    this.trendValue1.append(`span`).classed(`trendvalue1arrow`, true).html(upArrow)
                        .style({
                            "color": arrowColorI1, "font-family": this.settings.trendfontFamily,
                            "font-size": `${percentageFontTrend + 6}px`
                        });
                    const trend1Tooltip: string = this.getFormattedTooltipData(this.data.trend1Format, this.data.trendValueOne);
                    this.trendValue1.append(`span`).classed(`trendvalue1text`, true).text(updatedText1)
                        .style({
                            "color": this.settings.trendColor, "font-family": this.settings.trendfontFamily,
                            "font-size": `${this.settings.trendfontSize}px`
                        }).attr("title", `${trend1Tooltip} ${trend1ValText}`);
                    if (this.data.trendValueOne < 0) {
                        $(".trendvalue1arrow").css({ display: "inline-block", transform: "rotate(90deg)" });
                    }
                } else {
                    this.trendValue1.style(`display`, `none`);
                }
                if (this.data.trend2Exists) {
                    const trend2ValText: string = this.data.trend2ColName;
                    const textProps2: TextProperties = {
                        fontFamily: this.settings.trendfontFamily, fontSize: `${this.settings.trendfontSize}px`,
                        text: `${trend2Val} ${trend2ValText}`
                    };
                    if (this.settings.Orientation === "Horizontal") {
                        updatedText2 = textMeasurementService.getTailoredTextOrDefault(textProps2, (options.viewport.width / 2.1) - 20);
                    } else {
                        updatedText2 = textMeasurementService.getTailoredTextOrDefault(textProps2, availablewidth * 0.8);
                    }
                    this.trendValue2.style(`display`, `inline`);
                    this.trendValue2.select(`span.trendvalue2arrow`).remove();
                    this.trendValue2.select(`span`).remove();
                    this.trendValue2.append(`span`)
                        .classed(`trendvalue2arrow`, true)
                        .html(upArrow)
                        .style({
                            "color": arrowColorI2, "font-family": this.settings.trendfontFamily, "font-size": `${percentageFontTrend + 6}px`
                        });
                    const trend2Tooltip: string =
                        this.getFormattedTooltipData(this.data.trend2Format, this.data.trendValueTwo);
                    this.trendValue2.append(`span`).classed(`trendvalue2text`, true).text(updatedText2)
                        .style({
                            "color": this.settings.trendColor, "font-family": this.settings.trendfontFamily, "font-size": `${this.settings.trendfontSize}px`
                        }).attr("title", `${trend2Tooltip} ${trend2ValText} `);
                    if (this.data.trendValueTwo < 0) {
                        $(".trendvalue2arrow").css({ display: "inline-block", transform: "rotate(90deg)" });
                    }
                } else {
                    this.trendValue2.style(`display`, `none`);
                }
                trendLabelHeight = $(".lg_imagetab").innerHeight();
                targetLabelHeight = $(".lg_legend_target").height();
                const eleLabel: JQuery = this.settings.Orientation === "Horizontal" ? $(".lg_data_tab") : $(".LG_verticalDataLabel");
                const eleTrend: JQuery = $(".lg_imagetab");
                const eleLegend: JQuery = $(".lg_legend_tab");
                const domPositionLegend: ClientRect = eleLegend[0].getBoundingClientRect();
                const domPositionTrend: ClientRect = eleTrend[0].getBoundingClientRect();
                const overlap: boolean = !(domPositionTrend.right < domPositionLegend.left || domPositionTrend.left > domPositionLegend.right ||
                    domPositionTrend.bottom < domPositionLegend.top || domPositionTrend.top > domPositionLegend.bottom);
                if (overlap) {
                    $(".lg_legend_tab span").remove();
                }
                if (eleLabel && eleLabel.length && eleLabel[0]) {
                    const domPositionLabel: ClientRect = eleLabel[0].getBoundingClientRect();
                    const overlap1: boolean = !(domPositionLabel.right < domPositionTrend.left || domPositionLabel.left > domPositionTrend.right ||
                        domPositionLabel.bottom < domPositionTrend.top || domPositionLabel.top > domPositionTrend.bottom);
                    const overlap2: boolean = !(domPositionLabel.right < domPositionLegend.left || domPositionLabel.left > domPositionLegend.right ||
                        domPositionLabel.bottom < domPositionLegend.top || domPositionLabel.top > domPositionLegend.bottom);
                    if (overlap1) {
                        this.settings.Orientation === "Horizontal" ? $(".lg_legend_tab span").remove() : $(".LG_verticalDataLabel text").remove();
                    }
                    if (overlap2) {
                        this.settings.Orientation === "Horizontal" ? $(".lg_imagetab span").remove() : $(".LG_verticalDataLabel text").remove();
                    }
                }
            }
            if (this.settings.showScale) {
                this.showscale(translateVal, axisFunction, className, height, $this, axisFormatter, options, halfMaxFormattedDataWidth, viewport);
            }
        }

        private verticalColorFill(gradient: d3.Selection<SVGElement>, range: d3.selection.Update<number>, offSetValue: number[]) {
            let context: this = this;
            range.style("fill", (): string => {
                gradient = context.svgLinear.append("svg:linearGradient");
                gradient.attr("id", `gradient1`)
                    .classed("gradientSVG", true)
                    .attr("x1", "100%")
                    .attr("y1", "0%")
                    .attr("x2", "100%")
                    .attr("y2", "100%")
                    .attr("spreadMethod", "pad");
                if (this.settings.colorOption === `solidcolor`) {
                    return this.solidColorOption(gradient, context, offSetValue, context.colorsGlobal);
                }
                else {
                    return this.notSolidColorOption(gradient, context.colorsGlobal, offSetValue)
                }
            });
        }

        public solidColorOption(gradient, context, offSetValue, colors) {
            gradient.append('stop').attr('offset', '0%')
                .attr('stop-color', context.getDarkShade(colors[4], 0.5))
                .attr('stop-opacity', 1);
            gradient.append('stop').attr('offset', `${offSetValue[4]}%`)
                .attr('stop-color', colors[4])
                .attr('stop-opacity', 1);
            gradient.append('stop').attr('offset', `${offSetValue[4]}%`)
                .attr('stop-color', context.getDarkShade(colors[3], 0.5))
                .attr('stop-opacity', 1);
            gradient.append('stop').attr('offset', `${offSetValue[3]}%`)
                .attr('stop-color', colors[3])
                .attr('stop-opacity', 1);
            gradient.append('stop').attr('offset', `${offSetValue[3]}%`)
                .attr('stop-color', context.getDarkShade(colors[2], 0.5))
                .attr('stop-opacity', 1);
            gradient.append('stop').attr('offset', `${offSetValue[2]}%`)
                .attr('stop-color', colors[2])
                .attr('stop-opacity', 1);
            gradient.append('stop').attr('offset', `${offSetValue[2]}%`)
                .attr('stop-color', context.getDarkShade(colors[1], 0.5))
                .attr('stop-opacity', 1);
            gradient.append('stop').attr('offset', `${offSetValue[1]}%`)
                .attr('stop-color', colors[1])
                .attr('stop-opacity', 1);
            gradient.append('stop').attr('offset', `${offSetValue[1]}%`)
                .attr('stop-color', context.getDarkShade(this.settings.ComparisonFillColor, 0.5))
                .attr('stop-opacity', 1);
            gradient.append('stop').attr('offset', "100%")
                .attr('stop-color', this.settings.ComparisonFillColor)
                .attr('stop-opacity', 1);
            return `url(#gradient1)`;
        }

        public notSolidColorOption(gradient, colors, offSetValue) {
            gradient.append("stop").attr("offset", `${offSetValue[4]}%`)
                .attr("stop-color", colors[4])
                .attr("stop-opacity", 1);
            gradient.append("stop").attr("offset", `${offSetValue[3]}%`)
                .attr("stop-color", colors[3])
                .attr("stop-opacity", 1);
            gradient.append("stop").attr("offset", `${offSetValue[2]}%`)
                .attr("stop-color", colors[2])
                .attr("stop-opacity", 1);
            gradient.append("stop").attr("offset", `${offSetValue[1]}%`)
                .attr("stop-color", colors[1])
                .attr("stop-opacity", 1);
            gradient.append("stop").attr("offset", `${offSetValue[1]}%`)
                .attr("stop-color", this.settings.ComparisonFillColor)
                .attr("stop-opacity", 1);
            gradient.append("stop").attr("offset", "100%")
                .attr("stop-color", this.settings.ComparisonFillColor)
                .attr("stop-opacity", 1);
            return `url(#gradient1)`;
        }

        private horizontalColorFill(range: d3.selection.Update<number>, gradient: d3.Selection<SVGElement>, colors: string[], offSetValue: number[]) {
            if (this.settings.fillOption === `value`) {
                let context: this = this;
                range.style("fill", (): string => {
                    gradient = context.svgLinear.append("svg:linearGradient");
                    gradient.attr('id', `gradient1`)
                        .classed('gradientSVG', true)
                        .attr('spreadMethod', 'pad');
                    if (this.settings.colorOption === `solidcolor`) {
                        return this.solidColorOption(gradient, context, offSetValue, colors);
                    }
                    else {
                        return this.notSolidColorOption(gradient, colors, offSetValue);
                    }
                });
            } else {
                let context: this = this;
                range.style("fill", (): string => {
                    gradient = context.svgLinear.append("svg:linearGradient");
                    gradient.attr('id', `gradient1`)
                        .classed('gradientSVG', true)
                        .attr('spreadMethod', 'pad');
                    if (this.settings.colorOption === `solidcolor`) {
                        gradient.append('stop').attr('offset', '0%')
                            .attr('stop-color', context.getDarkShade(colors[3], 0.5)).attr('stop-opacity', 1);
                        gradient.append('stop').attr('offset', `${offSetValue[3]}%`)
                            .attr('stop-color', colors[3]).attr('stop-opacity', 1);
                        gradient.append('stop').attr('offset', `${offSetValue[3]}%`)
                            .attr('stop-color', context.getDarkShade(colors[2], 0.5)).attr('stop-opacity', 1);
                        gradient.append('stop').attr('offset', `${offSetValue[2]}%`)
                            .attr('stop-color', colors[2]).attr('stop-opacity', 1);
                        gradient.append('stop').attr('offset', `${offSetValue[2]}%`)
                            .attr('stop-color', context.getDarkShade(colors[1], 0.5)).attr('stop-opacity', 1);
                        gradient.append('stop').attr('offset', `${offSetValue[1]}%`)
                            .attr('stop-color', colors[1]).attr('stop-opacity', 1);
                        return `url(#gradient1)`;
                    }
                    else {
                        gradient.append("stop").attr("offset", `${offSetValue[3]}%`)
                            .attr("stop-color", colors[3])
                            .attr("stop-opacity", 1);
                        gradient.append("stop").attr("offset", `${offSetValue[2]}%`)
                            .attr("stop-color", colors[2])
                            .attr("stop-opacity", 1);
                        gradient.append("stop").attr("offset", `${offSetValue[1]}%`)
                            .attr("stop-color", colors[1])
                            .attr("stop-opacity", 1);
                        return `url(#gradient1)`;
                    }
                });
            }
        }
        private horizontalanimation(measure: d3.Selection<SVGElement>, measureHeight: number, xScale: d3.scale.Linear<number, number>, measureYPos: number,
            measure2: d3.selection.Update<number>, sortedMeasure: number[], updateVar: any, gradient: d3.Selection<SVGElement>, legendColor: string[]): d3.Selection<SVGElement> {
            if (categoryFlag === 0) {
                measure = this.svgLinear.append(`rect`).classed(`measure`, true).style(`fill`, "url(#gradient)");
                measure.attr(`height`, measureHeight).attr(`x`, xScale(xScale.domain()[0])).attr(`y`, measureYPos);
                if (this.settings.animationToggle) {
                    measure.attr("width", 0).transition().duration(this.settings.animationTime * 1000)
                        .attr(`width`, xScale(this.data.actual) - xScale(xScale.domain()[0]) < 0 ?
                            0 : xScale(this.data.actual) - xScale(xScale.domain()[0]));
                } else {
                    measure.attr(`width`, xScale(this.data.actual) - xScale(xScale.domain()[0]) < 0 ?
                        0 : xScale(this.data.actual) - xScale(xScale.domain()[0]));
                }
            } else if (categoryFlag === 1) {
                measure2 = this.svgLinear.selectAll(`rect.measure`).data(sortedMeasure);
                measure2.enter().append(`rect`).attr("class", "measure").attr(`id`, (d: number, index: number): string => {
                    return `measureId${index}`;
                });
                const constID: number = 3;
                const context: this = this;
                measureYPos = updateVar.modHeight / 4;
                measure2.style(`fill`, (d: number, index: number): string => {
                    gradient = context.svgLinear.append("svg:linearGradient");
                    gradient.attr("id", `gradientM${(constID + index)}`)
                        .classed("gradientSVG", true)
                        .attr("x1", "100%")
                        .attr("y1", "0%")
                        .attr("x2", "100%")
                        .attr("y2", "100%")
                        .attr("spreadMethod", "pad");
                    gradient.append("stop").attr("offset", "0%").attr("stop-color", context.getDarkShade(legendColor[index], 0.5)).attr("stop-opacity", 1);
                    gradient.append("stop").attr("offset", "100%").attr("stop-color", legendColor[index]).attr("stop-opacity", 1);
                    return `url(#gradientM${(constID + index)})`;
                });
                measure2.attr(`height`, (d: number, index: number): number => {
                    return measureHeight / (index / legendLength + 1);
                }).attr("y", (d: number, index: number): number => {
                    return (measureYPos + (secondLiteral * measureYPos - (measureHeight / (index / legendLength + 1))) / 2);
                }).attr(`x`, xScale(xScale.domain()[0]));
                if (this.settings.animationToggle) {
                    measure2.attr("width", (d: number, index: number): number => {
                        return 0;
                    }).transition().duration(this.settings.animationTime * 1000)
                        .attr(`width`, (d: number, index: number): number => {
                            return xScale(d) - xScale(xScale.domain()[0]) < 0 ? 0 : xScale(d) - xScale(xScale.domain()[0]);
                        });
                } else {
                    measure2.attr(`width`, (d: number, index: number): number => {
                        return xScale(d) - xScale(xScale.domain()[0]) < 0 ? 0 : xScale(d) - xScale(xScale.domain()[0]);
                    });
                }
            }
            return measure;
        }
        private targetline(hMarker: number, marker_select, xScale: d3.scale.Linear<number, number>, updateVar: any,
            hMarkerMin: number, markerTriangle_select, markerLine: d3.Selection<SVGElement>, minRangeValue: number, maxRangeValue: number, hMarkerMax: number) {
            if (this.settings.legendNewPosition === "aboveMarker") {
                let targetMarker: d3.Selection<SVGElement>;
                targetMarker = this.svg.append("polygon").classed("markerTriangle", true)
                    .attr({
                        points: `${hMarker - fourthLiteral}, ${eighthLiteral} ${hMarker + fourthLiteral}, ${eighthLiteral} ${hMarker}, ${nveTwo}`
                    }).style("fill", "brown")
                    .attr("stroke", "brown")
                    .attr("stroke-width", 3);
                targetMarker.on("mouseover", (): void => {
                    markerTriangle_select.attr("stroke-width", 5);
                    marker_select.attr("stroke-width", "5");
                });
                targetMarker.on("mouseout", (): void => {
                    markerTriangle_select.attr("stroke-width", "3");
                    marker_select.attr("stroke-width", "1");
                });
                markerLine.on("mouseover", (): void => {
                    markerTriangle_select.attr("stroke-width", 5);
                    marker_select.attr("stroke-width", "5");
                });
                markerLine.on("mouseout", (): void => {
                    markerTriangle_select.attr("stroke-width", "3");
                    marker_select.attr("stroke-width", "1");
                });
            }
            this.svgLinear.selectAll(`line.markerTilt`).remove();
            if (this.data.bestSet) {
                const bestMarker: number = xScale(this.data.best);
                this.svgLinear.append(`line`)
                    .classed(`bestMarker`, true)
                    .style("stroke-dasharray", "5, 2")
                    .style(`stroke`, `#000`)
                    .attr({ x1: bestMarker, x2: bestMarker, y1: 0, y2: updateVar.modHeight });
                if (this.settings.showScale) {
                    this.svgLinear.append(`line`)
                        .classed(`markerTilt`, true)
                        .style("stroke-dasharray", "5, 2")
                        .style(`stroke`, `#000`)
                        .attr({ x1: bestMarker, x2: bestMarker, y1: updateVar.modHeight, y2: (updateVar.modHeight + 10) });
                }
            }
            if (this.settings.showScale) {
                this.svgLinear.append(`line`)
                    .classed(`markerTilt`, true)
                    .style(`stroke`, `#000`)
                    .attr({ x1: hMarker, x2: hMarker, y1: updateVar.modHeight, y2: (updateVar.modHeight + 10) });
            }
            if (this.settings.showRange) {
                let strokeColor: string = this.settings.RangeTicksColor;
                this.svgLinear.append(`line`)
                    .classed(`markermin`, true)
                    .style(`stroke`, strokeColor)
                    .style("stroke-width", `${this.settings.rangeWidth}px`)
                    .attr({ x1: hMarkerMin, x2: hMarkerMin, y1: 0, y2: updateVar.modHeight })
                    .append("title")
                    .text(minRangeValue);
                if (minRangeValue < maxRangeValue) {
                    this.svgLinear.append(`line`)
                        .classed(`markermax`, true)
                        .style(`stroke`, strokeColor)
                        .style("stroke-width", `${this.settings.rangeWidth}px`)
                        .attr({
                            x1: hMarkerMax,
                            x2: hMarkerMax,
                            y1: 0,
                            y2: updateVar.modHeight
                        }).append("title")
                        .text(maxRangeValue);
                }
                let marker_min_max = this.svgLinear.selectAll(".markermin, .markermax");
                if (this.settings.rangeStyle === "dotted") {
                    marker_min_max.style("stroke-dasharray", ("1,1"));
                } else if (this.settings.rangeStyle === "dashed") {
                    marker_min_max.style("stroke-dasharray", ("3, 3"));
                } else {
                    marker_min_max.style("stroke-dasharray", (""));
                }
            }
        }
        private verticalshowcolor(colors: string[], offSetValue: number[], gradient: d3.Selection<SVGElement>, range: d3.selection.Update<number>,
            measureLeftPos: number, leftPos: number, modHeight: number, measureWidth: number, comparsionWidth: number, svgheight: number) {
            const zoneLen: number = this.colorsGlobal.length;
            for (let index: number = 0; index < zoneLen; index++) {
                colors.push(this.colorsGlobal[index]);
                offSetValue.push(this.data.states[index]);
            }
            if (this.settings.fillOption === `value`) {
                this.verticalColorFill(gradient, range, offSetValue);
            } else {
                if (this.settings.colorOption === `solidcolor`) {
                    let context: this = this;
                    range.style("fill", (d: number, index: number): string => {
                        if (index === 0) {
                            gradient = context.svgLinear.append("svg:linearGradient");
                            gradient.attr("id", `gradient1`).classed("gradientSVG", true)
                                .attr("x1", "100%")
                                .attr("y1", "0%")
                                .attr("x2", "100%")
                                .attr("y2", "100%")
                                .attr("spreadMethod", "pad");
                        }
                        else {
                            if (index === 1) {
                                gradient.append("stop").attr("offset", "0%")
                                    .attr("stop-color", context.getDarkShade(context.colorsGlobal[4 - index], 0.5)).attr("stop-opacity", 1);
                            } else {
                                gradient.append("stop").attr("offset", `${offSetValue[4 - index + 1]}%`)
                                    .attr("stop-color", context.getDarkShade(context.colorsGlobal[4 - index], 0.5)).attr("stop-opacity", 1);
                            }
                            gradient.append("stop").attr("offset", `${offSetValue[4 - index]}%`)
                                .attr("stop-color", context.colorsGlobal[4 - index])
                                .attr("stop-opacity", 1);
                        }
                        return `url(#gradient1)`;
                    });
                }
                else {
                    let context: this = this;
                    range.style("fill", (d: number, index: number): string => {
                        if (index === 0) {
                            gradient = context.svgLinear.append("svg:linearGradient");
                            gradient.attr("id", `gradient1`)
                                .classed("gradientSVG", true)
                                .attr("x1", "100%")
                                .attr("y1", "0%")
                                .attr("x2", "100%")
                                .attr("y2", "100%")
                                .attr("spreadMethod", "pad");
                        } else {
                            gradient.append("stop")
                                .attr("offset", `${offSetValue[4 - index]}%`)
                                .attr("stop-color", context.colorsGlobal[4 - index])
                                .attr("stop-opacity", 1);
                        }
                        return `url(#gradient1)`;
                    });
                }
            }
        }

        private showcolor(valueToPercent1, valueToPercent2, valueToPercent3, valueToPercent4, margin1, margin2, margin3, margin4) {
            if (this.settings.fillOption === `value`) {
                const range12Max: number = Math.max(this.settings.range1, this.settings.range2);
                const range123Max: number = Math.max(this.settings.range1, this.settings.range2, this.settings.range3);
                this.settings.range1 = this.settings.range1 === null ? null : this.settings.range1 < this.data.min ? null
                    : this.settings.range1 > this.data.max ? null : this.settings.range1;
                this.settings.range2 = this.settings.range2 === null ? null : this.settings.range2 < this.settings.range1 ? this.settings.range1
                    : this.settings.range2 > this.data.max ? null : this.settings.range2;
                this.settings.range3 = this.settings.range3 === null ? null
                    : this.settings.range3 < range12Max ? range12Max
                        : this.settings.range3 > this.data.max ? null : this.settings.range3;
                this.settings.range4 = this.settings.range4 === null ? null
                    : this.settings.range4 < range123Max ?
                        range123Max : this.settings.range4 > this.data.max ? null : this.settings.range4;
                valueToPercent1 = (this.settings.range1 - this.data.min) / (this.data.max - this.data.min);
                valueToPercent2 = (this.settings.range2 - this.data.min) / (this.data.max - this.data.min);
                valueToPercent3 = (this.settings.range3 - this.data.min) / (this.data.max - this.data.min);
                valueToPercent4 = (this.settings.range4 - this.data.min) / (this.data.max - this.data.min);
                margin1 = valueToPercent1 * 100;
                margin2 = valueToPercent2 * 100;
                margin3 = valueToPercent3 * 100;
                margin4 = valueToPercent4 * 100;
            } else {
                if (this.settings.percentageVal1 > 100) {
                    this.settings.percentageVal1 = 100;
                    this.settings.percentageVal2 = 0;
                    this.settings.percentageVal3 = 0;
                } else {
                    if (this.settings.percentageVal2 > (100 - this.settings.percentageVal1)) {
                        this.settings.percentageVal2 = 100 - this.settings.percentageVal1;
                        this.settings.percentageVal3 = 0;
                    } else {
                        if (this.settings.percentageVal3 >
                            (100 - this.settings.percentageVal1 - this.settings.percentageVal2)) {
                            this.settings.percentageVal3 = 100 - this.settings.percentageVal1 - this.settings.percentageVal2;
                        }
                    }
                }
                margin1 = this.settings.percentageVal1;
                margin2 = margin1 + this.settings.percentageVal2;
                margin3 = margin2 + this.settings.percentageVal3;
            }
        }

        private verticalbody(range: d3.selection.Update<number>, modHeight: number, yScale: d3.scale.Linear<number, number>, leftPos: number,
            gradient: d3.Selection<SVGElement>, measureColor: string, measure: d3.Selection<SVGElement>, measureWidth: number, measureLeftPos: number,
            measure2: d3.selection.Update<number>, sortedMeasure2: number[], legendColor: string[], vDataLabel: d3.Selection<SVGElement>,
            actualVal: string, svgheight: number, actualTooltip: string, percentageVal: PrimitiveValue): d3.Selection<SVGElement> {
            range.attr(`width`, modHeight)
                .attr(`height`, (d: number): number => {
                    return (yScale(yScale.domain()[0]) - yScale(d)) < 0
                        ? 0 : (yScale(yScale.domain()[0]) - yScale(d));
                }).attr(`x`, leftPos)
                .attr(`y`, -yScale(yScale.domain()[0]))
                .attr(`transform`, "rotate(180)");
            gradient = this.svgLinear.append("svg:linearGradient");
            gradient.attr("id", "gradient")
                .classed("gradientSVG", true).attr("x1", "100%").attr("y1", "100%")
                .attr("x2", "0%")
                .attr("y2", "100%")
                .attr("spreadMethod", "pad");
            gradient.append("stop").attr("offset", "0%")
                .attr("stop-color", this.getDarkShade(measureColor, 0.5)).attr("stop-opacity", 1);
            gradient.append("stop").attr("offset", "100%").attr("stop-color", measureColor).attr("stop-opacity", 1);
            if (categoryFlag === 0) {
                measure = this.svgLinear.append(`rect`).classed(`measure`, true).style(`fill`, "url(#gradient)").attr(`transform`, "rotate(180)");
                measure.attr(`width`, measureWidth).attr(`x`, measureLeftPos).attr(`y`, -yScale(yScale.domain()[0]));
                if (this.settings.animationToggle) {
                    measure.attr(`height`, 0).transition().duration(this.settings.animationTime * 1000)
                        .attr(`height`, yScale(yScale.domain()[0]) - yScale(this.data.actual));
                } else {
                    measure.attr(`height`, yScale(yScale.domain()[0]) - yScale(this.data.actual));
                }
            } else {
                measure2 = this.svgLinear.selectAll(`rect.measure`).data(sortedMeasure2);
                measure2.enter().append(`rect`).attr("class", "measure").attr(`id`, (d: number, index: number): string => {
                    return `measureId${index}`;
                });
                const constID: number = 3; const context: this = this;
                measure2.style(`fill`, (d: number, index: number): string => {
                    gradient = context.svgLinear.append("svg:linearGradient");
                    gradient.attr("id", `gradientM${(constID + index)}`)
                        .classed("gradientSVG", true).attr("x1", "100%").attr("y1", "100%")
                        .attr("x2", "0%")
                        .attr("y2", "100%")
                        .attr("spreadMethod", "pad");
                    gradient.append("stop").attr("offset", "0%").attr("stop-color", context.getDarkShade(legendColor[index], 0.5)).attr("stop-opacity", 1);
                    gradient.append("stop").attr("offset", "100%").attr("stop-color", legendColor[index]).attr("stop-opacity", 1);
                    return `url(#gradientM${(constID + index)})`;
                });
                measure2.attr(`width`, (d: number, index: number): number => {
                    return measureWidth / (index / legendLength + 1);
                }).attr(`x`, (d: number, index: number): number => {
                    return ((1.085 * measureLeftPos - (measureWidth / (index / legendLength + 1))) / secondLiteral);
                }).attr(`y`, -yScale(yScale.domain()[0])).attr(`transform`, "rotate(180)");
                if (this.settings.animationToggle) {
                    measure2.attr(`height`, (d: number): number => {
                        return 0;
                    }).transition().duration(this.settings.animationTime * 1000)
                        .attr(`height`, (d: number): number => {
                            return (yScale(yScale.domain()[0]) - yScale(d)) < 0 ? 0 : (yScale(yScale.domain()[0]) - yScale(d));
                        });
                } else {
                    measure2.attr(`height`, (d: number): number => {
                        return (yScale(yScale.domain()[0]) - yScale(d)) < 0 ? 0 : (yScale(yScale.domain()[0]) - yScale(d));
                    });
                }
            }
            this.trendValue1.style(`text-align`, `left`);
            this.trendValue2.style(`text-align`, `left`);
            $(".data_percentagev").hide();
            $(".data_totalv").hide();
            $(`.trendtext1v`).hide();
            $(`.trendtext2v`).hide();
            vDataLabel = d3.select(".linearSVG").append("g").classed("LG_verticalDataLabel", true);
            let difference: number;
            const diff: number = 150;
            const actualValLength: number = 6;
            if (this.settings.labelDisplayUnits === 1) {
                difference = diff + this.data.actual.toString().length * actualValLength;
            }
            else {
                difference = diff;
            }
            let availableWidth: number = parseInt($(".linearSVG").css("marginLeft").toString(), 10) - measureWidth - 10;
            const adjustFactor: number = 1.55;
            const widthAdjust: number = 0.3;
            if (this.settings.showlabel) {
                const textPropsv: TextProperties = { fontFamily: this.settings.fontFamily, fontSize: `${this.settings.fontSize}px`, text: actualVal };
                let updatedTextv: string = textMeasurementService.getTailoredTextOrDefault(textPropsv, availableWidth);
                vDataLabel.append("text").classed("data_totalv", true)
                    .attr(`transform`, `${`translate(`} ${(modHeight - adjustFactor * difference)}${`,`}${(svgheight - 20)} )`)
                    .style(`fill`, this.settings.DataColor)
                    .style(`font-family`, this.settings.fontFamily)
                    .style(`font-size`, `${this.settings.fontSize}px`)
                    .text(updatedTextv)
                    .append("title").text(actualTooltip);
            } else {
                $(".data_totalv").hide();
            }
            if (this.settings.showPercentage) {
                this.showPercentage(vDataLabel, modHeight, adjustFactor, difference, svgheight, availableWidth, percentageVal);
            } else {
                $(".data_percentagev").hide();
            }
            return measure;
        }

        private showPercentage(vDataLabel, modHeight, adjustFactor, difference, svgheight, availableWidth, percentageVal) {
            const textPropspercen: TextProperties = { fontFamily: this.settings.fontFamily, fontSize: `${this.settings.fontSize}px`, text: `${percentageVal.toString()}%` };
            let updatedTextpercen: string = textMeasurementService.getTailoredTextOrDefault(textPropspercen, availableWidth);
            vDataLabel.append("text").text(updatedTextpercen)
                .classed("data_percentagev", true)
                .attr(`transform`, `translate(${(modHeight - adjustFactor * difference)}${`,`}${(svgheight - 50)} )`)
                .style(`fill`, this.settings.PercentageDataColor)
                .style(`font-family`, this.settings.percentagefontFamily)
                .style(`font-size`, `${this.settings.percentagefontSize}px`)
                .append("title").text(`${percentageVal}%`);
        }

        private legendpos(legend_tab_selectAll, viewport: IViewport, legend, modHeight: number, divWidth: number,
            legendHeight: IViewport, xScale: d3.scale.Linear<number, number>) {
            if (categoryFlag === 1 && this.settings.Orientation === "Vertical") {
                if (this.settings.legendPos === "Left" || this.settings.legendPos === "Left center") {
                    if (this.settings.legendNewPosition === "aboveMarker") {
                        legend_tab_selectAll.style("margin-left", `${(viewport.width / 2) - (modHeight / 2) - divWidth - 10}px`);
                    } else {
                        legend_tab_selectAll.style("margin-left", `${legendHeight.width + 20}px`);
                    }
                } else {
                    if (this.settings.legendNewPosition === "aboveMarker") {
                        legend_tab_selectAll.style("margin-left", `${(viewport.width / 2) - (modHeight / 2) - divWidth - 10}px`);
                    } else {
                        legend_tab_selectAll.style("margin-left", `20px`);
                    }
                }
            }
            if (categoryFlag === 0 && this.settings.Orientation === "Horizontal") {
                if (this.settings.legendNewPosition === "aboveMarker") {
                    legend_tab_selectAll.style("margin-left", `${xScale(this.data.target) - (divWidth / 2)}px`);
                } else {
                    legend_tab_selectAll.style("margin-left", `${legendHeight.width + 20}px`);
                }
            } else if (categoryFlag === 1 && this.settings.Orientation === `Horizontal`) {
                if (this.settings.legendPos === "Left" || this.settings.legendPos === "Left center") {
                    if (this.settings.legendNewPosition === "aboveMarker") {
                        legend_tab_selectAll.style("margin-left", `${xScale(this.data.target) -
                            (divWidth / 2) + legendHeight.width}px`);
                    } else {
                        legend_tab_selectAll.style("margin-left", `${legendHeight.width + 20}px`);
                    }
                } else {
                    if (this.settings.legendNewPosition === "aboveMarker") {
                        legend_tab_selectAll.style("margin-left", `${xScale(this.data.target) - (divWidth / 2)}px`);
                    } else {
                        legend_tab_selectAll.style("margin-left", `${20}px`);
                    }
                }
            }
        }
        private legendshow(options: VisualUpdateOptions, updatedText: string, availablewidth: number) {
            if (this.data.best && this.settings.legendShow) {
                let bestFormatter: IValueFormatter = valueFormatter.create({
                    format: this.data.bestFormat, precision: this.settings.legendDecimalPlaces,
                    value: this.settings.legendDisplayUnits === 0 ? this.getValueUpdated(this.data.best) : this.settings.legendDisplayUnits
                });
                const legendProperties: TextProperties = {
                    fontFamily: `${this.settings.legendFontFamily}`,
                    fontSize: `${this.settings.legendFontSize}px`,
                    text: `${bestFormatter.format(this.data.best)} ${this.data.bestColName}`
                };
                const hWidth: number = (this.data.trend1Exists || this.data.trend2Exists) ?
                    (options.viewport.width / 2.5) - 20 : options.viewport.width - 20;
                const bestTooltip: string = this.getFormattedTooltipData(this.data.bestFormat, this.data.best);
                if (this.settings.Orientation === "Horizontal") {
                    updatedText = textMeasurementService.getTailoredTextOrDefault(legendProperties, hWidth);
                } else {
                    updatedText = textMeasurementService.getTailoredTextOrDefault(legendProperties, availablewidth * 0.8);
                }
                this.bestLegend.append(`span`).classed(`bestLabel`, true).html("&#9478")
                    .style({
                        "font-size": `${this.settings.legendFontSize}px`,
                        "margin-left": `${-this.settings.legendFontSize / 3}px`
                    }).style("color", this.settings.legendColor).attr("title", `${bestTooltip} ${this.data.bestColName}`);
                this.bestLegend.append(`span`).classed(`bestLabel`, true).text(updatedText)
                    .style({
                        "font-family": this.settings.legendFontFamily,
                        "font-size": `${this.settings.legendFontSize}px`
                    }).style("color", this.settings.legendColor);
            }
        }

        private tooltip(actualToolTipData: number, tooltipData: ITooltipData[], actualTooltipVal: string, targetToolTipData: number, minToolTipData: number, maxToolTipData: number) {
            if (this.isInteger(actualToolTipData)) {
                tooltipData.push({
                    displayName: this.data.actualColName,
                    value: actualTooltipVal.toString()
                });
            } else {
                tooltipData.push({
                    displayName: this.data.actualColName,
                    value: actualTooltipVal
                });
            }
            if (this.data.targetExists) {
                const targetTooltipVal: string = this.getFormattedTooltipData(this.data.targetFormat, this.data.target);
                targetToolTipData = this.data.target;
                    tooltipData.push({
                        displayName: this.data.targetColName,
                        value: targetTooltipVal.toString()
                    });
            }
            if (this.data.minFlag) {
                const minValue: number = <number>this.dataView.categorical.values[this.minValueIndex].values[0];
                if (this.minValueFlag && this.data.min !== minValue) {
                    this.data.min = Number(minValue);
                }
                if (this.data.min && this.data.minFlag) {
                    const minTooltipVal: string = this.getFormattedTooltipData(this.data.minFormat, this.data.min);
                    minToolTipData = this.data.min;
                        tooltipData.push({
                            displayName: this.data.minColName,
                            value: minTooltipVal.toString()
                        });
                }
            }
            if (this.data.maxFlag) {
                const maxValue: number = <number>this.dataView.categorical.values[this.maxValueIndex].values[0];
                if (this.maxValueFlag && this.data.max !== maxValue) {
                    this.data.max = Number(maxValue);
                }
                if (this.data.max && this.data.maxFlag) {
                    const maxTooltipVal: string = this.getFormattedTooltipData(this.data.maxFormat, this.data.max);
                    const maxTooltip: string = maxTooltipVal.replace(",", "");
                    maxToolTipData = this.data.min;
                        tooltipData.push({
                            displayName: this.data.maxColName,
                            value: maxTooltipVal.toString()
                        });
                }
            }
            if (this.data.best) {
                const bestTooltipVal: string = this.getFormattedTooltipData(this.data.bestFormat, this.data.best);
                tooltipData.push({
                    displayName: this.data.bestColName,
                    value: bestTooltipVal
                });
            }
            this.tooltipServiceWrapper.addTooltip(
                this.svgLinear.selectAll("rect.range,rect.rectRange"),
                (tooltipEvent: TooltipEventArgs<number>) => tooltipData,
                (tooltipEvent: TooltipEventArgs<number>) => null);
            if (categoryFlag === 0) {
                this.tooltipServiceWrapper.addTooltip(
                    this.svgLinear.selectAll("rect.measure,rect.range,rect.rectRange"),
                    (tooltipEvent: TooltipEventArgs<number>) => tooltipData,
                    (tooltipEvent: TooltipEventArgs<number>) => null);
            }
            if (tooltipFLag === 0) {
                for (let index: number = 0; index < linearDataPoint.length; index++) {
                    this.tooltipServiceWrapper.addTooltip(
                        this.svgLinear.selectAll(`rect#measureId${linearDataPoint.length - index - 1}`),
                        (tooltipEvent: TooltipEventArgs<number>) => tooltip[index].tooltipDataPoint,
                        (tooltipEvent: TooltipEventArgs<number>) => null);
                }
            } else {
                this.tooltipServiceWrapper.addTooltip(
                    this.svgLinear.selectAll(`rect#measureId0`),
                    (tooltipEvent: TooltipEventArgs<number>) => tooltip[0].tooltipDataPoint,
                    (tooltipEvent: TooltipEventArgs<number>) => null);
            }
        }

        private cursorposition(legendPosSettings: any, legendHeight: IViewport, rightMargin: number) {
            d3.selectAll(".navArrow").style("cursor", "pointer");
            let imagetab_selectAll = d3.selectAll(".lg_imagetab");
            let data_Tab_selectAll = d3.selectAll(".lg_data_tab");
            let linearSVG_selectAll = d3.selectAll(".linearSVG");
            if (categoryFlag === 1 && this.settings.Orientation === `Horizontal`) {
                if (legendPosSettings === "Top" || legendPosSettings === "Top center") {
                    imagetab_selectAll.style("margin-top", `${legendHeight.height}px`);
                    data_Tab_selectAll.style("margin-left", `${this.settings.fontSize / 2.0}px`);
                    linearSVG_selectAll.style("margin-left", `0px`);
                } else if (legendPosSettings === "Left" || legendPosSettings === "Left center") {
                    if (this.settings.legendNewPosition === "topLeft") {
                        d3.selectAll(".lg_legend_tab").style("margin-left", `${legendHeight.width}px`);
                    }
                    imagetab_selectAll.style("margin-top", `0px`);
                    data_Tab_selectAll.style("margin-left", `${legendHeight.width + (this.settings.fontSize / 2.0)}px`);
                    linearSVG_selectAll.style("margin-left", `${legendHeight.width}px`);
                } else {
                    imagetab_selectAll.style("margin-top", `0px`);
                    data_Tab_selectAll.style("margin-left", `${this.settings.fontSize / 2.0}px`);
                    linearSVG_selectAll.style("margin-left", `0px`);
                }
                if (legendPosSettings === "Right" || legendPosSettings === "Right center") {
                    rightMargin = legendHeight.width;
                } else {
                    rightMargin = 0;
                }
            } else if (categoryFlag === 1 && this.settings.Orientation === `Vertical`) {
                if (this.settings.legendPos === "Top" || this.settings.legendPos === "Top center") {
                    imagetab_selectAll.style("margin-top", `${legendHeight.height}px`).style("margin-left", `${this.settings.fontSize / 2.0}px`);
                    linearSVG_selectAll.style("margin-top", `${legendHeight.height}px`);
                } else if (this.settings.legendPos === "Left" || this.settings.legendPos === "Left center") {
                    imagetab_selectAll.style("margin-top", `0px`).style("margin-left", `${legendHeight.width + (this.settings.fontSize / 2.0)}px`);
                } else {
                    imagetab_selectAll.style("margin-top", `0px`).style("margin-left", `${this.settings.fontSize / 2.0}px`);
                    linearSVG_selectAll.style("margin-top", `0px`);
                }
            } else {
                imagetab_selectAll.style("margin-top", `10px`);
            }
            if (this.data.states.length === 0) {
                if (categoryFlag === 0 && this.settings.showColor) {
                    this.data.states.push(this.data.max);
                    this.data.states.push(this.settings.range4);
                    this.data.states.push(this.settings.range3);
                    this.data.states.push(this.settings.range2);
                    this.data.states.push(this.settings.range1);
                } else {
                    this.data.states.push(this.data.max);
                }
            }
        }

        private markerline(markerLine, marker_select, vMarker, markerTriangle_select, yScale, modHeight, measureLeftPos,
            vMarkerMin, vMarkerMax, minRangeValue, maxRangeValue) {
            markerLine.on("mouseover", (): void => {
                marker_select.attr("stroke-width", "5");
            });
            markerLine.on("mouseout", (): void => {
                marker_select.attr("stroke-width", "1");
            });
            if (this.settings.legendNewPosition === "aboveMarker") {
                let targetMarker: d3.Selection<SVGElement> = this.svg.append("polygon").classed("markerTriangle", true)
                    .attr({
                        points: `${-5},${vMarker - fourthLiteral} ${-5},${vMarker + fourthLiteral} ${3}, ${vMarker}`
                    }).style("fill", "brown")
                    .attr("stroke", "brown")
                    .attr("stroke-width", 3);
                targetMarker.on("mouseover", (): void => {
                    markerTriangle_select.attr("stroke-width", 5);
                    marker_select.attr("stroke-width", "5");
                });
                targetMarker.on("mouseout", (): void => {
                    markerTriangle_select.attr("stroke-width", "3");
                    marker_select.attr("stroke-width", "1");
                });
                markerLine.on("mouseover", (): void => {
                    markerTriangle_select.attr("stroke-width", 5);
                    marker_select.attr("stroke-width", "5");
                });
                markerLine.on("mouseout", (): void => {
                    markerTriangle_select.attr("stroke-width", "3");
                    marker_select.attr("stroke-width", "1");
                });
            }
            this.svgLinear.selectAll(`line.markerTilt`).remove();
            if (this.data.bestSet) {
                const bestMarker: number = yScale(this.data.best);
                this.svgLinear.append(`line`)
                    .classed(`bestMarker`, true)
                    .style("stroke-dasharray", "5, 5")
                    .style(`stroke`, `#000`)
                    .attr({
                        x1: 3,
                        x2: modHeight + 3,
                        y1: bestMarker,
                        y2: bestMarker
                    });
                if (this.settings.showScale) {
                    this.svgLinear.append(`line`)
                        .classed(`markerTilt`, true)
                        .style("stroke-dasharray", "5, 5")
                        .style(`stroke`, `#000`)
                        .attr({
                            x1: modHeight + 3, x2: modHeight + 10,
                            y1: bestMarker,
                            y2: bestMarker
                        });
                }
            }
            let linePostion: number = Math.abs(Math.round(Math.abs(measureLeftPos) - (modHeight + fourthLiteral)));
            if (this.settings.showScale) {
                this.svgLinear.append(`line`)
                    .classed(`markerTilt`, true)
                    .style(`stroke`, `#000`)
                    .attr({ x1: modHeight + 3, x2: modHeight + 10, y1: vMarker, y2: vMarker });
            }
            if (this.settings.showRange) {
                let strokeColor: string = this.settings.RangeTicksColor;
                this.svgLinear.append(`line`)
                    .classed(`markermin`, true)
                    .style(`stroke`, strokeColor)
                    .style("stroke-width", `${this.settings.rangeWidth}px`)
                    .attr({
                        x1: fourthLiteral,
                        x2: modHeight + fourthLiteral,
                        y1: vMarkerMin,
                        y2: vMarkerMin
                    });
                if (minRangeValue < maxRangeValue) {
                    this.svgLinear.append(`line`)
                        .classed(`markermax`, true)
                        .style(`stroke`, strokeColor)
                        .style("stroke-width", `${this.settings.rangeWidth}px`)
                        .attr({
                            x1: fourthLiteral,
                            x2: modHeight + fourthLiteral,
                            y1: vMarkerMax,
                            y2: vMarkerMax
                        });
                }
                let marker_min_max = this.svgLinear.selectAll(".markermin, .markermax");
                if (this.settings.rangeStyle === "dotted") {
                    marker_min_max.style("stroke-dasharray", ("1, 1"));
                } else if (this.settings.rangeStyle === "dashed") {
                    marker_min_max.style("stroke-dasharray", ("3, 3"));
                } else {
                    marker_min_max.style("stroke-dasharray", (""));
                }
            }
        }
        private abovemarker(options: VisualUpdateOptions, updatedText: string, availablewidth: number,
            legend_tab_selectAll: any, viewport: IViewport, modHeight: number, legendHeight: IViewport, xScale: d3.scale.Linear<number, number>) {
            if (this.settings.legendShow) {
                if (this.data.target) {
                    let targetFormatter: IValueFormatter = valueFormatter.create({
                        format: this.data.targetFormat, precision: this.settings.legendDecimalPlaces,
                        value: this.settings.legendDisplayUnits === 0 ?
                            this.getValueUpdated(this.data.target) : this.settings.legendDisplayUnits
                    });
                    let legendTextProperties: TextProperties = {
                        fontFamily: `${this.settings.legendFontFamily}`,
                        fontSize: `${this.settings.legendFontSize}px`,
                        text: `${targetFormatter.format(this.data.target)} ${this.data.targetColName}`
                    };
                    if (this.settings.legendNewPosition === "topLeft") {
                        legendTextProperties.text = `| ${targetFormatter.format(this.data.target)} ${this.data.targetColName}`;
                    }
                    const legendHorizontalWidth: number = (this.data.trend1Exists || this.data.trend2Exists) ?
                        (options.viewport.width / 2.5) - 20 : options.viewport.width - 20;
                    const targetTooltip: string = this.getFormattedTooltipData(this.data.targetFormat, this.data.target);
                    if (this.settings.Orientation === "Horizontal") {
                        updatedText = textMeasurementService.getTailoredTextOrDefault(legendTextProperties, legendHorizontalWidth);
                    } else {
                        updatedText = textMeasurementService.getTailoredTextOrDefault(legendTextProperties, availablewidth * 0.8);
                    }
                    this.targetLegend.append(`span`).classed(`targetLabel`, true).text(updatedText)
                        .style({
                            "font-family": this.settings.legendFontFamily,
                            "font-size": `${this.settings.legendFontSize}px`
                        }).style("color", this.settings.legendColor).attr("title", `${targetTooltip} ${this.data.targetColName}`);
                    let divWidth: number;
                    if (this.rootElement.select(".lg_legend_tab")) {
                        divWidth = parseFloat(d3.select(".lg_legend_tab").style("width"));
                    }
                    if (categoryFlag === 0 && this.settings.Orientation === "Vertical") {
                        if (this.settings.legendNewPosition === "aboveMarker") {
                            legend_tab_selectAll.style("margin-left", `${(viewport.width / secondLiteral) - (modHeight / secondLiteral) - divWidth - 10}px`);
                        } else {
                            legend_tab_selectAll.style("margin-left", `20px`);
                        }
                    }
                    this.legendpos(legend_tab_selectAll, viewport, legend, modHeight, divWidth, legendHeight, xScale)
                }
                this.bestLegend.selectAll(`.bestLabel`).remove();
                this.legendshow(options, updatedText, availablewidth);
            } else {
                this.targetLegend.selectAll("*").remove();
                this.bestLegend.selectAll("*").remove();
            }
        }

        private colors(updateVar, viewport, legendHeight, width, halfMaxFormattedDataWidth, percentageVal): PrimitiveValue {
            const heightAdjust: number = 20;
            if (this.settings.Orientation === `Horizontal`) {
                $(".lg_imagetab").css("left", "auto");
                if (categoryFlag === 0) {
                    $(".lg_imagetab").css("right", 0);
                }
                else {
                    $(".lg_imagetab").css("right", `${legendHeight.width + (this.settings.fontSize / 2.0)}px`);
                }
                updateVar.height = viewport.height;
                width = viewport.width - halfMaxFormattedDataWidth;
                updateVar.modHeight = viewport.height / 12;
                this.svg.attr({
                    height: viewport.height,
                    width: viewport.width
                }).style("margin-top", `${(viewport.height / secondLiteral)}px`);
                d3.select(".lg_data_tab").style("margin-top", `${(viewport.height / secondLiteral) - 50}px`);
                this.svgLinear.attr(`transform`, `translate(0,5)`);
            } else {
                $(".lg_imagetab").css("right", "auto");
                $(".lg_imagetab").css("left", 0);
                width = viewport.height;
                updateVar.height = viewport.width - heightAdjust;
                updateVar.modHeight = width / 12;
                this.svg.attr({
                    height: "100%", width: viewport.height / 11
                }).style("margin-left", `${(viewport.width / secondLiteral) - (updateVar.modHeight / secondLiteral)}px`);
                this.svgLinear.attr(`transform`, `translate(5,0)`);
            }
            const percentVal: number = 100;
            if (this.data.target) {
                if (!this.settings.showRemainingPercentage) {
                    if (this.data.actual < 0 && this.data.target < 0) {
                        percentageVal = (this.data.actual * percentVal) / this.data.target;
                        percentageVal = 200 - percentageVal;
                        percentageVal = parseFloat(Number(percentageVal).toFixed(secondLiteral));
                    } else {
                        percentageVal = (this.data.actual * percentVal) / this.data.target;
                        percentageVal = parseFloat(Number(percentageVal).toFixed(secondLiteral));
                    }
                } else {
                    if (this.data.actual < 0 && this.data.target < 0) {
                        percentageVal = -((this.data.target - this.data.actual) / this.data.target) * percentVal;
                        if (this.data.actual > this.data.target) {
                            percentageVal = 0;
                        }
                        percentageVal = parseFloat(Number(percentageVal).toFixed(secondLiteral));
                    } else {
                        percentageVal = (this.data.actual * percentVal) / this.data.target;
                        percentageVal = percentVal - percentageVal < 0 ? 0 : percentVal - percentageVal;
                        percentageVal = parseFloat(Number(percentageVal).toFixed(secondLiteral));
                    }
                }
            } else {
                percentageVal = percentVal;
            }
            return percentageVal;
        }
        private margincolor(updateVar1) {
            if (this.settings.fillOption === `value`) {
                const range12Max: number = Math.max(this.settings.range1, this.settings.range2);
                const range123Max: number = Math.max(this.settings.range1, this.settings.range2, this.settings.range3);
                this.settings.range1 = this.settings.range1 === null ? null : this.settings.range1 < this.data.min ? null
                    : this.settings.range1 > this.data.max ? null : this.settings.range1;
                this.settings.range2 = this.settings.range2 === null ? null : this.settings.range2 < this.settings.range1 ? this.settings.range1
                    : this.settings.range2 > this.data.max ? null : this.settings.range2;
                this.settings.range3 = this.settings.range3 === null ? null : this.settings.range3 < range12Max ? range12Max
                    : this.settings.range3 > this.data.max ? null : this.settings.range3;
                this.settings.range4 = this.settings.range4 === null ? null : this.settings.range4 < range123Max ?
                    range123Max : this.settings.range4 > this.data.max ? null : this.settings.range4;
                updateVar1.valueToPercent1 = (this.settings.range1 - this.data.min) / (this.data.max - this.data.min);
                updateVar1.valueToPercent2 = (this.settings.range2 - this.data.min) / (this.data.max - this.data.min);
                updateVar1.valueToPercent3 = (this.settings.range3 - this.data.min) / (this.data.max - this.data.min);
                updateVar1.valueToPercent4 = (this.settings.range4 - this.data.min) / (this.data.max - this.data.min);
                updateVar1.margin1 = updateVar1.valueToPercent1 * 100;
                updateVar1.margin2 = updateVar1.valueToPercent2 * 100;
                updateVar1.margin3 = updateVar1.valueToPercent3 * 100;
                updateVar1.margin4 = updateVar1.valueToPercent4 * 100;
            } else {
                if (this.settings.percentageVal1 > 100) {
                    this.settings.percentageVal1 = 100;
                    this.settings.percentageVal2 = 0;
                    this.settings.percentageVal3 = 0;
                } else {
                    if (this.settings.percentageVal2 > (100 - this.settings.percentageVal1)) {
                        this.settings.percentageVal2 = 100 - this.settings.percentageVal1;
                        this.settings.percentageVal3 = 0;
                    } else {
                        if (this.settings.percentageVal3 > (100 - this.settings.percentageVal1 - this.settings.percentageVal2)) {
                            this.settings.percentageVal3 = 100 - this.settings.percentageVal1 - this.settings.percentageVal2;
                        }
                    }
                }
                updateVar1.margin1 = this.settings.percentageVal1;
                updateVar1.margin2 = updateVar1.margin1 + this.settings.percentageVal2;
                updateVar1.margin3 = updateVar1.margin2 + this.settings.percentageVal3;
            }
        }

        private colorshow(updateVar1, sortedMeasure, sortedRanges, range, colors, offSetValue, gradient, updateVar): d3.Selection<SVGElement> {
            for (let iterator: number = 0; iterator < actualValue.length; iterator++) {
                sortedMeasure[iterator] = actualValue[actualValue.length - iterator - 1];
            }
            if (categoryFlag === 0 && this.settings.showColor) {
                this.data.states.push(this.data.max);
                if (this.settings.fillOption === `value`) {
                    this.data.states.push(updateVar1.margin4);
                }
                this.data.states.push(updateVar1.margin3);
                this.data.states.push(updateVar1.margin2);
                this.data.states.push(updateVar1.margin1);
            } else {
                this.data.states.push(this.data.max);
            }
            sortedRanges = this.data.states;
            if (this.settings.fillOption === `value`) {
                range = this.svgLinear.append(`rect`).classed(`rectRange`, true).data(sortedRanges);
                range.enter().append("rect");
            } else {
                if (this.settings.Orientation === `Horizontal`) {
                    range = this.svgLinear.append(`rect`).classed(`rectRange`, true).data(sortedRanges);
                    range.enter().append("rect");
                }
            }
            if (categoryFlag === 0 && this.settings.showColor) {
                const zoneLen: number = this.colorsGlobal.length;
                for (let index: number = 0; index < zoneLen; index++) {
                    colors.push(this.colorsGlobal[index]);
                    offSetValue.push(this.data.states[index]);
                }
                this.horizontalColorFill(range, gradient, colors, offSetValue);
                updateVar1.measureHeight = updateVar.modHeight / secondLiteral;
                updateVar1.measureYPos = updateVar.modHeight / fourthLiteral;
            } else {
                gradient = this.svgLinear.append("svg:linearGradient");
                gradient.attr("id", "gradient2").classed("gradientSVG", true)
                    .attr("x1", "100%")
                    .attr("y1", "0%")
                    .attr("x2", "100%")
                    .attr("y2", "100%")
                    .attr("spreadMethod", "pad");
                gradient.append("stop").attr("offset", "0%").attr("stop-color", this.getDarkShade(this.settings.ComparisonFillColor, 0.5)).attr("stop-opacity", 1);
                gradient.append("stop").attr("offset", "100%").attr("stop-color", this.settings.ComparisonFillColor).attr("stop-opacity", 1);
                range.style(`fill`, "url(#gradient2)");
                updateVar1.measureHeight = updateVar.modHeight;
                updateVar1.measureYPos = 0;
            }
            return gradient;
        }

        private height(legend_tab_selectAll: any, verticalCacheHeight: number, horizontalCacheHeight: number, legendHeight: IViewport,
            viewport: IViewport, yScale: d3.scale.Linear<number, number>) {
            if (categoryFlag === 0 && this.settings.Orientation === "Horizontal") {
                if (this.settings.legendNewPosition === "aboveMarker") {
                    legend_tab_selectAll.style("margin-top", `${((viewport.height / secondLiteral) - horizontalCacheHeight)}px`);
                }
                else {
                    legend_tab_selectAll.style("margin-top", `0px`);
                }
            } else if (categoryFlag === 0 && this.settings.Orientation === "Vertical") {
                if (this.settings.legendNewPosition === "aboveMarker") {
                    legend_tab_selectAll.style("margin-top", `${yScale(this.data.target) - verticalCacheHeight}px`);
                } else {
                    legend_tab_selectAll.style("margin-top", `0px`);
                }
            } else if (categoryFlag === 1 && this.settings.Orientation === `Horizontal`) {
                if (this.settings.legendPos === "Top" || this.settings.legendPos === "Top center") {
                    if (this.settings.legendNewPosition === "aboveMarker") {
                        legend_tab_selectAll.style("margin-top", `${(viewport.height / secondLiteral) - horizontalCacheHeight}px`);
                    } else {
                        legend_tab_selectAll.style("margin-top", `${legendHeight.height}px`);
                    }
                } else {
                    if (this.settings.legendNewPosition === "aboveMarker") {
                        legend_tab_selectAll.style("margin-top", `${((viewport.height / secondLiteral) - horizontalCacheHeight)}px`);
                    } else {
                        legend_tab_selectAll.style("margin-top", `0px`);
                    }
                }
            } else if (categoryFlag === 1 && this.settings.Orientation === `Vertical`) {
                if (this.settings.legendPos === "Top" || this.settings.legendPos === "Top center") {
                    if (this.settings.legendNewPosition === "aboveMarker") {
                        legend_tab_selectAll.style("margin-top", `${yScale(this.data.target) + legendHeight.height - verticalCacheHeight}px`);
                    } else {
                        legend_tab_selectAll.style("margin-top", `${(1 + legendHeight.height)}px`);
                    }
                } else {
                    if (this.settings.legendNewPosition === "aboveMarker") {
                        legend_tab_selectAll.style("margin-top", `${yScale(this.data.target) - verticalCacheHeight}px`);
                    } else {
                        legend_tab_selectAll.style("margin-top", `0px`);
                    }
                }
            }
        }

        private view(options: VisualUpdateOptions): IViewport {
            if (categoryFlag !== 1) {
                $(".legend").hide();
            }
            else {
                $(`.legend`).show();
            }
            let viewport: IViewport = options.viewport;
            if (viewport.width < 60 || viewport.height < 50) {
                return;
            }
            if ((this.settings.Orientation === `Horizontal`) && (this.settings.legendPos === "Top" || this.settings.legendPos === "Top center")) {
                if ((viewport.height / secondLiteral) - this.legend.getMargins().height < trendLabelHeight + targetLabelHeight) {
                    if (!trendLabelFlag) {
                        showTrendStatus = this.settings.showTrend;
                        trendLabelFlag = true;
                        if (this.settings.legendNewPosition === "topLeft") {
                            $(".lg_legend_tab").hide();
                        }
                    }
                    this.settings.showTrend = false;
                } else {
                    if (trendLabelFlag) {
                        this.settings.showTrend = showTrendStatus;
                        trendLabelFlag = false;
                        $(".lg_legend_tab").show();
                    }
                }
                if (((viewport.height / secondLiteral) - 50 < this.legend.getMargins().height + targetLabelHeight)) {
                    $(".lg_legend_tab").hide();
                }
                else {
                    $(".lg_legend_tab").show();
                }
                if (((viewport.height / secondLiteral) - 50 < this.legend.getMargins().height)) {
                    $(".lg_data_tab").hide();
                }
                else {
                    $(".lg_data_tab").show();
                }
            } else if (this.settings.Orientation === `Horizontal`) {
                if ((viewport.height / secondLiteral) < trendLabelHeight + targetLabelHeight) {
                    if (!trendLabelFlag) {
                        showTrendStatus = this.settings.showTrend;
                        trendLabelFlag = true;
                        if (this.settings.legendNewPosition === "topLeft") {
                            $(".lg_legend_tab").hide();
                        }
                    }
                    this.settings.showTrend = false;
                } else {
                    if (trendLabelFlag) {
                        this.settings.showTrend = showTrendStatus;
                        trendLabelFlag = false;
                        $(".lg_legend_tab").show();
                    }
                }
            }
            return viewport;
        }

        private legendspace(legendPosSettings: any, legendHeight: IViewport, viewport: IViewport) {
            if (categoryFlag === 1) {
                this.settings.showColor = false;
            } else {
                this.settings.showColor = getValue<number>(this.dataView.metadata.objects, `colorSelector`, `show`, 0) <= 0
                    ? false : getValue<number>(this.dataView.metadata.objects, `colorSelector`, `show`, 0);
            }
            if (this.settings.animationTime > 6) {
                this.settings.animationTime = 6;
            } else if (this.settings.animationTime < 1) {
                this.settings.animationTime = 1;
            }
            if (this.settings.rangeWidth > 8) {
                this.settings.rangeWidth = 8;
            }

            if (categoryFlag === 1 && this.settings.Orientation === `Vertical` &&
                (legendPosSettings === "Bottom" || legendPosSettings === "Bottom center" || legendPosSettings === "Top" || legendPosSettings === "Top center")) {
                viewport.height = viewport.height - legendHeight.height;
            } else if (categoryFlag === 1 && this.settings.Orientation === `Horizontal` &&
                (legendPosSettings === "Right" || legendPosSettings === "Right center" || legendPosSettings === "Left" || legendPosSettings === "Left center")) {
                viewport.width = viewport.width - legendHeight.width - 15;
            } else if (categoryFlag === 1 && this.settings.Orientation === `Horizontal` && (legendPosSettings === "Bottom" || legendPosSettings === "Bottom center")) {
                viewport.height = viewport.height - legendHeight.height;
            }
        }

        private verticalcolor(range: d3.selection.Update<number>, gradient: d3.Selection<SVGElement>) {
            gradient = this.svgLinear.append("svg:linearGradient");
            gradient.attr("id", "gradient2").classed("gradientSVG", true).attr("x1", "100%").attr("y1", "100%")
                .attr("x2", "0%")
                .attr("y2", "100%")
                .attr("spreadMethod", "pad");
            gradient.append("stop").attr("offset", "0%").attr("stop-color",
                this.getDarkShade(this.settings.ComparisonFillColor, 0.5)).attr("stop-opacity", 1);
            gradient.append("stop").attr("offset", "100%")
                .attr("stop-color", this.settings.ComparisonFillColor).attr("stop-opacity", 1);
            range.style(`fill`, "url(#gradient2)");
        }

        private horizontalcolor(gradient: d3.Selection<SVGElement>, range: d3.selection.Update<number>) {
            gradient = this.svgLinear.append("svg:linearGradient");
            gradient.attr("id", "gradient2").classed("gradientSVG", true).attr("x1", "100%")
                .attr("y1", "0%").attr("x2", "100%").attr("y2", "100%").attr("spreadMethod", "pad");
            gradient.append("stop").attr("offset", "0%").attr("stop-color",
                this.getDarkShade(this.settings.ComparisonFillColor, 0.5)).attr("stop-opacity", 1);
            gradient.append("stop").attr("offset", "100%").attr("stop-color", this.settings.ComparisonFillColor).attr("stop-opacity", 1);
            range.style(`fill`, "url(#gradient2)");
        }

        private gradient(measureColor: string, gradient: d3.Selection<SVGElement>) {
            gradient = this.svgLinear.append("svg:linearGradient");
            gradient.attr("id", "gradient").classed("gradientSVG", true).attr("x1", "100%").attr("y1", "0%")
                .attr("x2", "100%").attr("y2", "100%").attr("spreadMethod", "pad");
            gradient.append("stop").attr("offset", "0%").attr("stop-color", this.getDarkShade(measureColor, 0.5)).attr("stop-opacity", 1);
            gradient.append("stop").attr("offset", "100%").attr("stop-color", measureColor).attr("stop-opacity", 1);
        }

        private range: d3.selection.Update<number>;
        private measure: d3.Selection<SVGElement>;
        private measure2: d3.selection.Update<number>
        private xScale: d3.scale.Linear<number, number>;

        private category(options: VisualUpdateOptions, updatedText: string, legend_tab_selectAll: any, viewport: IViewport, updateVar: any,
            legendHeight: IViewport, trend1Val: string, upArrow: string, percentageFontTrend: number, trend2Val: string,
            className: string, translateVal: string, axisFunction: d3.svg.Axis, $this: this, axisFormatter: IValueFormatter, halfMaxFormattedDataWidth: number) {
            let availablewidth: number = parseInt($(".linearSVG").css("marginLeft").toString(), 10) - $(".linearSVG").width();
            this.targetLegend.select(`.targetLabel`).remove();
            this.abovemarker(options, updatedText, availablewidth, legend_tab_selectAll, viewport, updateVar.modHeight, legendHeight, this.xScale);
            this.showtrend(trend1Val, options, availablewidth, upArrow, percentageFontTrend, trend2Val, className, translateVal, axisFunction,
                updateVar.height, $this, axisFormatter, halfMaxFormattedDataWidth, viewport);
            if (this.data.target < this.data.min || !(this.data.targetSet) || this.data.target > this.data.max) {
                this.svgLinear.selectAll(`line.marker`).remove();
                this.svgLinear.selectAll(`line.markerTilt`).remove();
            } else {
                this.svgLinear.selectAll(`.marker`).style(`display`, `block`);
                this.svgLinear.selectAll(`line.markerTilt`).style(`display`, `block`);
            }
            if (categoryFlag === 1) {
                prevFlag = options.dataViews[0].categorical.categories[0].values.length;
            }
            if (categoryFlag === 1 && this.settings.Orientation === `Vertical` && (this.settings.legendPos === "Bottom"
                || this.settings.legendPos === "Bottom center" || this.settings.legendPos === "Top" || this.settings.legendPos === "Top center")) {
                viewport.height = viewport.height + legendHeight.height;
            } else if (categoryFlag === 1 && this.settings.Orientation === `Horizontal` && (this.settings.legendPos === "Right"
                || this.settings.legendPos === "Right center" || this.settings.legendPos === "Left" || this.settings.legendPos === "Left center")) {
                viewport.width = viewport.width + legendHeight.width + 15;
            }
            else if (categoryFlag === 1 && this.settings.Orientation === `Horizontal` && (this.settings.legendPos === "Bottom"
                || this.settings.legendPos === "Bottom center")) {
                viewport.height = viewport.height + legendHeight.height;
            }
            const eleWidth: number = $(".lg_data_tab").width() + $(".lg_imagetab").width() + 20;
            const actualTooltipVal: string = this.getFormattedTooltipData(this.data.actualFormat, this.data.actual);
            let tooltipData: ITooltipData[] = [];
            let minToolTipData: number;
            let targetToolTipData: number;
            let actualToolTipData: number = this.data.actual;
            let maxToolTipData: number;
            this.tooltip(actualToolTipData, tooltipData, actualTooltipVal, targetToolTipData, minToolTipData, maxToolTipData);
        }

        private scale() {
            this.svgLinear.selectAll(`rect.range`).remove();
            this.svgLinear.selectAll(`.rectRange`).remove();
            this.svgLinear.selectAll(`rect.measure`).remove();
            $(".lg_data_total").hide();
            if (this.settings.showlabel) {
                $(".lg_data_total").show();
            }
            if (this.settings.showPercentage) {
                $(".lg_data_percentage").show();
            } else {
                $(".lg_data_percentage").hide();
            }
            this.trendValue1.style(`text-align`, `right`);
            this.trendValue2.style(`text-align`, `right`);
            this.data.min = this.xScale.domain()[0];
            this.data.max = this.xScale.domain()[1];
        }

        public categoryFlagAndShowColor(categoryFlag, updateVar1) {
            if (categoryFlag === 0 && this.settings.showColor) {
                this.data.states.push(this.data.max);
                if (this.settings.fillOption === `value`) {
                    this.data.states.push(updateVar1.margin4);
                }
                this.data.states.push(updateVar1.margin3);
                this.data.states.push(updateVar1.margin2);
                this.data.states.push(updateVar1.margin1);
            }
            else {
                this.data.states.push(this.data.max);
            }
        }

        public categoryFlagAndShowColorTwo(categoryFlag, colors, updateVar1, offSetValue, gradient, updateVar) {
            if (categoryFlag === 0 && this.settings.showColor) {
                const zoneLen: number = this.colorsGlobal.length;
                for (let index: number = 0; index < zoneLen; index++) {
                    colors.push(this.colorsGlobal[index]);
                    offSetValue.push(this.data.states[index]);
                }
                this.horizontalColorFill(this.range, gradient, colors, offSetValue);
                updateVar1.measureHeight = updateVar.modHeight / secondLiteral;
                updateVar1.measureYPos = updateVar.modHeight / fourthLiteral;
            } else {
                this.horizontalcolor(gradient, this.range);
                updateVar1.measureHeight = updateVar.modHeight;
                updateVar1.measureYPos = 0;
            }
        }


        public categoryFlagAndShowColorThree(margin1, margin2, margin3, margin4) {
            if (categoryFlag === 0 && this.settings.showColor) {
                this.data.states.push(this.data.max);
                if (this.settings.fillOption === `value`) {
                    this.data.states.push(margin4);
                }
                this.data.states.push(margin3);
                this.data.states.push(margin2);
                this.data.states.push(margin1);
            }
            else {
                this.data.states.push(this.data.max);
            }
        }

        public checkIndividualFlag(legendColor) {
            if (individualFlag !== 0) {
                legendColor[0] = categoryLegend[individualFlag - 1].color;
            } else {
                let colorIndex: number = 0;
                for (let index: number = 0; index < categoryLegend.length; index++) {
                    if (tempSelectionId !== null && categoryLegend[index].key === selectedKey) {
                        legendColor[colorIndex] = categoryLegend[index].color; colorIndex++;
                    } else {
                        legendColor[index] = categoryLegend[categoryLegend.length - index - 1].color;
                    }
                }
            }
        }

        public orientationHorizontal(sortedRanges: number[], colors, offSetValue, updateVar, measureColor, gradient, minRangeValue,
            maxRangeValue, xAxis, arrayOne, legendColor, axisFormatter, maxFormattedDataWidth, viewport, actualFormatter) {
            this.scale();
            let xTextProperties: TextProperties = {
                fontFamily: `${this.settings.scaleFontFamily}`, fontSize: `${this.settings.scaleFontSize}px`, text: axisFormatter.format(this.data.max)
            };
            debugger
            const eleLabel: JQuery = $(".lg_data_tab");
            if (eleLabel && eleLabel.length && eleLabel[0]) {
                const domPositionLabel: ClientRect = eleLabel[0].getBoundingClientRect();
                if (domPositionLabel.top < 0) {
                    $(".lg_data_tab text").hide();
                }
                const eleLegend: JQuery = $(".lg_legend_tab");
                const domPositionLegend: ClientRect = eleLegend[0].getBoundingClientRect();
                const overlap: boolean = !(domPositionLabel.top > domPositionLegend.bottom);
                if (overlap && this.settings.legendNewPosition !== "aboveMarker") {
                    this.settings.Orientation === "Horizontal" ? $(".lg_data_tab text").hide() : $(".LG_verticalDataLabel text").remove();
                }
            }
            let xMaxFormattedDataWidth: number = textMeasurementService.measureSvgTextWidth(xTextProperties), xHalfMaxFormattedDataWidth: number = maxFormattedDataWidth / secondLiteral;
            const distance: number = (xHalfMaxFormattedDataWidth * 10 / xHalfMaxFormattedDataWidth);
            this.xScale.range([distance, viewport.width - distance]);
            xAxis = d3.svg.axis().scale(this.xScale).tickFormat(actualFormatter.format).orient("down");
            minRangeValue = (this.settings.MinRangeValue === null || this.settings.MinRangeValue < this.data.min || this.settings.MinRangeValue > this.data.max)
                ? this.data.min : this.settings.MinRangeValue; maxRangeValue = (this.settings.MaxRangeValue === null || this.settings.MaxRangeValue
                    < this.data.min || this.settings.MaxRangeValue > this.data.max) ? this.data.max : this.settings.MaxRangeValue;
            let updateVar1 = {
                margin1: 0, margin2: 0, margin3: 0, margin4: 0, valueToPercent1: 0, valueToPercent2: 0, valueToPercent3: 0, valueToPercent4: 0, measureHeight: 0, measureYPos: 0
            }
            this.data.max = this.xScale.domain()[1];
            this.data.states = [];
            let sortedMeasure: number[] = [];
            this.margincolor(updateVar1);
            for (let iterator: number = 0; iterator < actualValue.length; iterator++) {
                sortedMeasure[iterator] = actualValue[actualValue.length - iterator - 1];
            }
            this.categoryFlagAndShowColor(categoryFlag, updateVar1);
            sortedRanges = this.data.states;
            if (this.settings.fillOption === `value`) {
                this.range = this.svgLinear.append(`rect`).classed(`rectRange`, true).data(sortedRanges);
                this.range.enter().append("rect");
            }
            else {
                if (this.settings.Orientation === `Horizontal`) {
                    this.range = this.svgLinear.append(`rect`).classed(`rectRange`, true).data(sortedRanges);
                    this.range.enter().append("rect");
                }
            }
            this.categoryFlagAndShowColorTwo(categoryFlag, colors, updateVar1, offSetValue, gradient, updateVar);
            this.range.attr(`x`, this.xScale(this.xScale.domain()[0])).attr(`width`, (d: number): number => {
                return (this.xScale(d) - this.xScale(this.xScale.domain()[0])) < 0 ? 0 : (this.xScale(d) - this.xScale(this.xScale.domain()[0]));
            }).attr(`height`, updateVar.modHeight);
            this.gradient(measureColor, gradient);
            this.measure = this.horizontalanimation(this.measure, updateVar1.measureHeight, this.xScale, updateVar1.measureYPos,
                this.measure2, sortedMeasure, updateVar, gradient, legendColor);
            if (this.data.max <= this.data.min) {
                if (this.measure === undefined) {
                    $(".rectRange").remove();
                    $(".measure").remove();
                    this.nullValueError();
                }
                this.measure.style(`display`, `none`);
            }
            let hMarker: number = this.xScale(this.data.target), hMarkerMin: number = this.xScale(minRangeValue);
            let hMarkerMax: number = this.xScale(maxRangeValue), marker_select = d3.select(".marker");
            let markerTriangle_select = d3.select(".markerTriangle");
            let markerLine: d3.Selection<SVGElement> = this.svgLinear.append(`line`).classed(`marker`, true)
                .style(`stroke`, `brown`).attr({ x1: hMarker, x2: hMarker, y1: 0, y2: updateVar.modHeight });
            markerLine.on("mouseover", (): void => {
                marker_select.attr("stroke-width", "5");
            });
            markerLine.on("mouseout", (): void => {
                marker_select.attr("stroke-width", "1");
            });
            this.targetline(hMarker, marker_select, this.xScale, updateVar, hMarkerMin, markerTriangle_select, markerLine, minRangeValue, maxRangeValue, hMarkerMax);
            arrayOne[1] = `translate(0,${(updateVar.modHeight + 15)} )`;
            arrayOne[2] = xAxis;
            arrayOne[0] = "lg_xLabels";
            return arrayOne;
        }

        public fillOption(sortedRanges: number[]) {
            this.range = this.svgLinear.append(`rect`).classed(`rectRange`, true).data(sortedRanges);
            this.range.enter().append("rect");
            return this.range;
        }

        public orientationVertical(offSetValue, minRangeValue, maxRangeValue, viewport, sortedRanges: number[], colors, gradient, yScale, actualFormatter,
            updateVar, svgheight, actualTooltip, percentageVal, vMarker, measureColor, legendColor, vDataLabel, actualVal, arrayTwo) {
            offSetValue = [];
            let margin1: number, margin2: number, margin3: number, margin4: number, valueToPercent1: number;
            let valueToPercent2: number, valueToPercent3: number, valueToPercent4: number;
            this.data.min = yScale.domain()[0];
            this.data.max = yScale.domain()[1];
            minRangeValue = (this.settings.MinRangeValue === null || this.settings.MinRangeValue < this.data.min || this.settings.MinRangeValue > this.data.max)
                ? this.data.min : this.settings.MinRangeValue; maxRangeValue = (this.settings.MaxRangeValue === null || this.settings.MaxRangeValue < this.data.min
                    || this.settings.MaxRangeValue > this.data.max) ? this.data.max : this.settings.MaxRangeValue;
            let yAxis: d3.svg.Axis = d3.svg.axis().scale(yScale).tickFormat(actualFormatter.format).orient("right");
            const leftPos: number = -(viewport.height / 11);
            let measureLeftPos: number, measureWidth: number, comparsionWidth: number;
            this.svgLinear.selectAll(`rect.range`).remove();
            this.data.max = yScale.domain()[1];
            this.data.states = [];
            if (this.settings.fillOption === `value`) {
                const range12Max: number = Math.max(this.settings.range1, this.settings.range2);
                const range123Max: number = Math.max(this.settings.range1, this.settings.range2, this.settings.range3);
                this.settings.range1 = this.settings.range1 === null ? null : this.settings.range1 < this.data.min ? null
                    : this.settings.range1 > this.data.max ? null : this.settings.range1, this.settings.range2 = this.settings.range2 === null
                        ? null : this.settings.range2 < this.settings.range1 ? this.settings.range1 : this.settings.range2 > this.data.max ? null : this.settings.range2;
                this.settings.range3 = this.settings.range3 === null ? null : this.settings.range3 < range12Max ? range12Max
                    : this.settings.range3 > this.data.max ? null : this.settings.range3, this.settings.range4 = this.settings.range4 === null
                        ? null : this.settings.range4 < range123Max ? range123Max : this.settings.range4 > this.data.max ? null : this.settings.range4;
                valueToPercent1 = (this.settings.range1 - this.data.min) / (this.data.max - this.data.min);
                valueToPercent2 = (this.settings.range2 - this.data.min) / (this.data.max - this.data.min);
                valueToPercent3 = (this.settings.range3 - this.data.min) / (this.data.max - this.data.min);
                valueToPercent4 = (this.settings.range4 - this.data.min) / (this.data.max - this.data.min);
                margin1 = valueToPercent1 * 100;
                margin2 = valueToPercent2 * 100;
                margin3 = valueToPercent3 * 100;
                margin4 = valueToPercent4 * 100;
            } else {
                if (this.settings.percentageVal1 > 100) {
                    this.settings.percentageVal1 = 100;
                    this.settings.percentageVal2 = 0;
                    this.settings.percentageVal3 = 0;
                }
                else {
                    if (this.settings.percentageVal2 > (100 - this.settings.percentageVal1)) {
                        this.settings.percentageVal2 = 100 - this.settings.percentageVal1;
                        this.settings.percentageVal3 = 0;
                    }
                    else {
                        if (this.settings.percentageVal3 > (100 - this.settings.percentageVal1 - this.settings.percentageVal2)) {
                            this.settings.percentageVal3 = 100 - this.settings.percentageVal1 - this.settings.percentageVal2;
                        }
                    }
                }
                margin1 = this.settings.percentageVal1;
                margin2 = margin1 + this.settings.percentageVal2;
                margin3 = margin2 + this.settings.percentageVal3;
            }
            this.categoryFlagAndShowColorThree(margin1, margin2, margin3, margin4);
            sortedRanges = this.data.states;
            let sortedMeasure2: number[] = [];
            for (let index: number = 0; index < actualValue.length; index++) {
                sortedMeasure2[index] = actualValue[actualValue.length - index - 1];
            }
            this.range = this.fillOption(sortedRanges);
            if (this.settings.showColor) {
                this.verticalshowcolor(colors, offSetValue, gradient, this.range, measureLeftPos, leftPos, updateVar.modHeight, measureWidth, comparsionWidth, svgheight);
                measureLeftPos = leftPos + updateVar.modHeight / fourthLiteral, measureWidth = updateVar.modHeight / secondLiteral, comparsionWidth = updateVar.modHeight / 6;
            } else {
                this.verticalcolor(this.range, gradient); measureLeftPos = leftPos;
                measureWidth = updateVar.modHeight;
                comparsionWidth = updateVar.modHeight / 3;
            }
            this.measure = this.verticalbody(this.range, updateVar.modHeight, yScale, leftPos, gradient, measureColor, this.measure, measureWidth,
                measureLeftPos, this.measure2, sortedMeasure2, legendColor, vDataLabel, actualVal, svgheight, actualTooltip, percentageVal);
            if (this.data.max <= this.data.min) {
                if (this.measure === undefined) {
                    $(".rectRange").remove();
                    $(".measure").remove();
                    this.nullValueError();
                }
                this.measure.style(`display`, `none`);
            }
            const eleLabel: JQuery = $(".LG_verticalDataLabel");
            if (eleLabel && eleLabel.length && eleLabel[0]) {
                const domPosition: ClientRect = eleLabel[0].getBoundingClientRect();
                if (domPosition.left < 0) {
                    $(".LG_verticalDataLabel text").remove();
                }
            }
            let vMarkerMin: number = yScale(minRangeValue), vMarkerMax: number = yScale(maxRangeValue);
            vMarker = yScale(this.data.target);
            let marker_select = d3.select(".marker"), markerTriangle_select = d3.select(".markerTriangle");
            let markerLine: d3.Selection<SVGElement> = this.svgLinear.append(`line`).classed(`marker`, true).style(`stroke`, `brown`)
                .attr({ x1: 3, x2: updateVar.modHeight + 3, y1: vMarker, y2: vMarker });
            this.markerline(markerLine, marker_select, vMarker, markerTriangle_select, yScale, updateVar.modHeight, measureLeftPos,
                vMarkerMin, vMarkerMax, minRangeValue, maxRangeValue);
            arrayTwo[1] = `${`translate(`}${(updateVar.modHeight + 15)}${`,`}${(0)})`;
            arrayTwo[2] = yAxis;
            arrayTwo[0] = "lg_yLabels";
            return arrayTwo;
        }

        public dataTargetNull(measureColor) {
            if (this.data.target !== null) {
                if (this.data.actual > this.data.target) {
                    measureColor = this.settings.ActualFillColorGreater;
                } else if (this.data.actual === this.data.target) {
                    measureColor = this.settings.ActualFillColorEqual;
                }
            }
            return measureColor;
        }

        public checkOrientation(className, translateVal, axisFunction, sortedRanges, colors, offSetValue, updateVar, measureColor, gradient,
            minRangeValue, maxRangeValue, xAxis, legendColor, viewport, yScale, actualFormatter, svgheight, actualTooltip, percentageVal, vMarker,
            vDataLabel, actualVal, options, updatedText, legend_tab_selectAll, legendHeight, trend1Val, upArrow, percentageFontTrend, trend2Val, axisFormatter,
            halfMaxFormattedDataWidth, $this, maxFormattedDataWidth) {
            if (this.settings.Orientation === `Horizontal`) {
                let arrayOne: any = [className, translateVal, axisFunction];
                arrayOne = this.orientationHorizontal(sortedRanges, colors, offSetValue, updateVar, measureColor, gradient, minRangeValue, maxRangeValue, xAxis,
                    arrayOne, legendColor, axisFormatter, maxFormattedDataWidth, viewport, actualFormatter);
                className = arrayOne[0], translateVal = arrayOne[1], axisFunction = arrayOne[2];
            }
            else {
                let arrayTwo: any = [className, translateVal, axisFunction];
                arrayTwo = this.orientationVertical(offSetValue, minRangeValue, maxRangeValue, viewport, sortedRanges, colors, gradient, yScale, actualFormatter,
                    updateVar, svgheight, actualTooltip, percentageVal, vMarker, measureColor, legendColor, vDataLabel, actualVal, arrayTwo);
                className = arrayTwo[0], translateVal = arrayTwo[1], axisFunction = arrayTwo[2];
            }
            this.category(options, updatedText, legend_tab_selectAll, viewport, updateVar, legendHeight, trend1Val, upArrow, percentageFontTrend, trend2Val, className,
                translateVal, axisFunction, $this, axisFormatter, halfMaxFormattedDataWidth);
        }

        public update(options: VisualUpdateOptions): void {
            try {
                this.events.renderingStarted(options);
                let $this: this = this;
                $this.visualOptions = options;
                let vMarker: number;
                categoryLegend = [];
                let gradient: d3.Selection<SVGElement>;
                this.removeAllClasses();
                this.svg.style("margin-left", 0);
                this.svg.style("margin-top", 0);
                this.dataView = options.dataViews[0];
                if (!options.dataViews || !this.dataView || !this.dataView.metadata) { return; }
                this.data = this.converter(this.dataView, options);
                let viewport = this.view(options)
                if (!this.data.actualExists) {
                    const message: string = 'Please add "Actual value" field';
                    this.rootElement.append("div").classed("lg_ErrorMessage", true).text(message).attr("title", message);
                    return;
                }
                let legendHeight: IViewport = this.legend.getMargins(), legendPosSettings = this.settings.legendPos;
                if (this.data.actual === null) { return; }
                this.getSettings(this.dataView.metadata.objects);
                this.legendspace(legendPosSettings, legendHeight, viewport);
                let rightMargin: number;
                d3.selectAll(".legendItem").style("cursor", "pointer");
                this.cursorposition(legendPosSettings, legendHeight, rightMargin);
                let legendColor: string[] = [], sortedRanges: number[] = this.data.states;
                let percentageVal: PrimitiveValue, actualVal: string, trend1Val: string;
                let trend2Val: string, width: number, updateVar = { height: 0, modHeight: 0 };
                const svgheight: number = viewport.height;
                this.checkIndividualFlag(legendColor);
                if (this.data.max === null) {
                    this.data.max = 0;
                }
                let axisFormatter: IValueFormatter = valueFormatter.create({
                    format: this.data.actualFormat, precision: this.settings.scaleDecimalPlaces, value: this.settings.scaleDisplayUnits === 0
                        ? this.getValueUpdated(this.data.max) : this.settings.scaleDisplayUnits
                });
                let textProperties: TextProperties = {
                    fontFamily: `${this.settings.scaleFontFamily}`, fontSize: `${this.settings.scaleFontSize}px`, text: axisFormatter.format(this.data.max)
                };
                let maxFormattedDataWidth: number = textMeasurementService.measureSvgTextWidth(textProperties), halfMaxFormattedDataWidth: number = maxFormattedDataWidth / 2;
                percentageVal = this.colors(updateVar, viewport, legendHeight, width, halfMaxFormattedDataWidth, percentageVal);
                let minRangeValue: number, maxRangeValue: number, vDataLabel: d3.Selection<SVGElement>, upArrow: string = `&#8599`;
                let percentageFont: number = this.settings.fontSize / 2.0, percentageFontTrend: number = this.settings.trendfontSize / 2.5;
                this.xScale = d3.scale.linear().domain([this.data.min, this.data.max]).range([30, viewport.width]).nice();
                let yScale: d3.scale.Linear<number, number> = d3.scale.linear().domain([this.data.min, this.data.max]).range([viewport.height - 15, 15]).nice();
                let xAxis: d3.svg.Axis;
                const precisionValue: number = this.settings.markerWidth, precisionValueTrend: number = this.settings.lineWidth;
                actualVal = this.getFormattedData(this.data.actual, this.settings.labelDisplayUnits, precisionValue, this.data.actualFormat);
                trend1Val = this.getFormattedData(this.data.trendValueOne, this.settings.trendDisplayUnits, precisionValueTrend, this.data.trend1Format);
                trend2Val = this.getFormattedData(this.data.trendValueTwo, this.settings.trendDisplayUnits, precisionValueTrend, this.data.trend2Format);
                const textProps: TextProperties = { fontFamily: this.settings.fontFamily, fontSize: `${this.settings.fontSize}px`, text: actualVal };
                const actualTooltip: string = this.getFormattedTooltipData(this.data.actualFormat, this.data.actual)
                const horizontalWidth: number = (this.settings.showPercentage) ? (options.viewport.width / 2.1) - 20 : options.viewport.width - 30;
                let updatedText: string = textMeasurementService.getTailoredTextOrDefault(textProps, horizontalWidth);
                this.actual.text(updatedText).attr("title", actualTooltip).style(`font-size`, `${this.settings.fontSize}px`)
                    .style(`font-family`, this.settings.fontFamily).style(`color`, this.settings.DataColor).style(`margin-right`, `${percentageFont}px`);
                const textPropspercent: TextProperties = { fontFamily: this.settings.percentagefontFamily, fontSize: `${this.settings.percentagefontSize}px`, text: `${percentageVal}%` };
                const dataWidth: number = $(".lg_data_total").width(), viewportWidthCache: number = 70;
                const updatedTextpercent: string = textMeasurementService.getTailoredTextOrDefault(textPropspercent, options.viewport.width - dataWidth - viewportWidthCache);
                this.percentage.text(updatedTextpercent).attr("title", `${percentageVal}%`).style(`font-size`, `${this.settings.percentagefontSize}px`)
                    .style(`color`, this.settings.PercentageDataColor).style(`font-Family`, this.settings.percentagefontFamily);
                let actualFormatter: IValueFormatter = valueFormatter.create({ format: this.data.actualFormat }), className: string;
                let translateVal: string, axisFunction: d3.svg.Axis, legend_tab_selectAll = d3.selectAll(".lg_legend_tab");
                const horizontalCacheHeight: number = 38, verticalCacheHeight: number = 13;
                this.height(legend_tab_selectAll, verticalCacheHeight, horizontalCacheHeight, legendHeight, viewport, yScale)
                let colors: string[] = [], offSetValue: number[] = [], measureColor: string = this.settings.ActualFillColor;
                this.removeSvgMarker();
                measureColor = this.dataTargetNull(measureColor);
                this.checkOrientation(className, translateVal, axisFunction, sortedRanges, colors, offSetValue, updateVar, measureColor, gradient,
                    minRangeValue, maxRangeValue, xAxis, legendColor, viewport, yScale, actualFormatter, svgheight, actualTooltip, percentageVal, vMarker,
                    vDataLabel, actualVal, options, updatedText, legend_tab_selectAll, legendHeight, trend1Val, upArrow, percentageFontTrend, trend2Val, axisFormatter,
                    halfMaxFormattedDataWidth, $this, maxFormattedDataWidth);
                this.events.renderingFinished(options);
            } catch (exeption) {
                this.events.renderingFailed(options, exeption);
            }
        }

        public getValueUpdated(d: number): number {
            let primaryFormatterVal: number = 0;
            const alternateFormatter: number = parseInt(d.toString(), 10).toString().length;
            if (alternateFormatter > 9) {
                primaryFormatterVal = 1e9;
            } else if (alternateFormatter <= 9 && alternateFormatter > 6) {
                primaryFormatterVal = 1e6;
            } else if (alternateFormatter <= 6 && alternateFormatter > 4) {
                primaryFormatterVal = 1e3;
            } else {
                primaryFormatterVal = 10;
            }

            return primaryFormatterVal;
        }

        public chartOrientationCase(objectEnumeration, objectName) {
            objectEnumeration.push({
                objectName, selector: null, properties: {
                    Orientation: this.settings.Orientation
                }
            });
            return objectEnumeration;
        }

        public legendSettings(objectEnumeration, objectName) {
            objectEnumeration.push({
                objectName, selector: null, properties: {
                    show: this.settings.legendShow, position: this.settings.legendNewPosition, fill: this.settings.legendColor, fontSize: this.settings.legendFontSize,
                    fontFamily: this.settings.legendFontFamily, displayUnits: this.settings.legendDisplayUnits, decimalPlaces: this.settings.legendDecimalPlaces
                }
            });
            return objectEnumeration;
        }

        public categorySettings(objectEnumeration, objectName) {
            objectEnumeration.push({
                objectName, selector: null, properties: {
                    fontSize: this.settings.categoryFontSize, title: this.settings.categoryTitle, color: this.settings.legendTextColor, position: this.settings.legendPos
                }
            });
            return objectEnumeration;
        }

        public colorsCase(objectEnumeration, objectName, index) {
            objectEnumeration.push({
                objectName, displayName: index.key, properties: {
                    fillColor: {
                        solid: {
                            color: index.color
                        }
                    }
                }, selector: index.selectionId.getSelector()
            });
            return objectEnumeration;
        }

        public animationEffect(objectEnumeration, objectName) {
            objectEnumeration.push({
                objectName, selector: null,
                properties: { show: this.settings.animationToggle, animationTime: this.settings.animationTime }
            });
            return objectEnumeration;
        }

        public colorSelector(objectEnumeration, objectName) {
            if (categoryFlag === 0) {
                if (this.settings.fillOption === `value`) {
                    objectEnumeration.push({
                        objectName, selector: null,
                        properties: {
                            show: this.settings.showColor, fillOption: this.settings.fillOption, colorOption: this.settings.colorOption,
                            range1: this.settings.range1, Zone1: this.settings.Zone1,
                            range2: this.settings.range2, Zone2: this.settings.Zone2, range3: this.settings.range3,
                            Zone3: this.settings.Zone3, range4: this.settings.range4, Zone4: this.settings.Zone4
                        }
                    });
                }
                else {
                    {
                        objectEnumeration.push({
                            objectName,
                            selector: null,
                            properties: {
                                show: this.settings.showColor, fillOption: this.settings.fillOption, colorOption: this.settings.colorOption,
                                percentage1: this.settings.percentageVal1, area1: this.settings.area1, percentage2: this.settings.percentageVal2,
                                area2: this.settings.area2, percentage3: this.settings.percentageVal3, area3: this.settings.area3
                            }
                        });
                    }
                }
            }
            return objectEnumeration;
        }

        public scaleSettings(objectEnumeration, objectName) {
            objectEnumeration.push({
                objectName,
                selector: null,
                properties: {
                    show: this.settings.showScale, color: this.settings.scaleColor, fontSize: this.settings.scaleFontSize,
                    fontFamily: this.settings.scaleFontFamily, displayUnits: this.settings.scaleDisplayUnits, decimalPlaces: this.settings.scaleDecimalPlaces
                }
            });
            return objectEnumeration;
        }

        public targetRange(objectEnumeration, objectName) {
            objectEnumeration.push({
                objectName, selector: null,
                properties: {
                    show: this.settings.showRange, MinRangeValue: this.settings.MinRangeValue,
                    MaxRangeValue: this.settings.MaxRangeValue, RangeTicksColor: this.settings.RangeTicksColor,
                    rangeWidth: this.settings.rangeWidth, rangeStyle: this.settings.rangeStyle
                }
            });
            return objectEnumeration;
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions):
            VisualObjectInstanceEnumeration {
            let objectName: string = options.objectName;
            let objectEnumeration: VisualObjectInstance[] = [];
            if (!this.data) {
                this.data = LinearGauge.GETDEFAULTDATA();
            }
            switch (options.objectName) {
                case `ChartOrientation`:
                    objectEnumeration = this.chartOrientationCase(objectEnumeration, objectName);
                    break;
                case `legendSettings`:
                    objectEnumeration = this.legendSettings(objectEnumeration, objectName);
                    break;
                case "categorySettings":
                    if (categoryFlag === 1) {
                        objectEnumeration = this.categorySettings(objectEnumeration, objectName);
                    }
                    break;
                case "colors":
                    if (categoryFlag === 1) {
                        for (const index of categoryLegend) {
                            objectEnumeration = this.colorsCase(objectEnumeration, objectName, index);
                        }
                    }
                    break;
                case "animationEffect":
                    objectEnumeration = this.animationEffect(objectEnumeration, objectName);
                    break;
                case `colorSelector`:
                    objectEnumeration = this.colorSelector(objectEnumeration, objectName);
                    break;
                case `ScaleSettings`:
                    objectEnumeration = this.scaleSettings(objectEnumeration, objectName);
                    break;
                case `TargetRange`:
                    objectEnumeration = this.targetRange(objectEnumeration, objectName);
                    break;
                case `Indicator`:
                    if (this.data.trendValueOne || this.data.trendValueTwo) {
                        let props: {} = {};
                        if (this.data.trendValueOne) {
                            props[`Indicator1`] = this.settings.Indicator1;
                        }
                        if (this.data.trendValueTwo) {
                            props[`Indicator2`] = this.settings.Indicator2;
                        }
                        objectEnumeration.push({ objectName, selector: null, properties: props });
                    }
                    break;
                case `general`:
                    objectEnumeration.push({
                        objectName: `general`, selector: null,
                        properties: {
                            ActualFillColor: { solid: { color: this.settings.ActualFillColor } }, ActualFillColorEqual: { solid: { color: this.settings.ActualFillColorEqual } },
                            ActualFillColorGreater: { solid: { color: this.settings.ActualFillColorGreater } },
                            ComparisonFillColor: { solid: { color: this.settings.ComparisonFillColor } }
                        }
                    });
                    break;
                case `labels`:
                    objectEnumeration.push({
                        objectName: `labels`, selector: null,
                        properties: {
                            show: this.settings.showlabel, DataColor: { solid: { color: this.settings.DataColor } },
                            fontSize: this.settings.fontSize, fontFamily: this.settings.fontFamily,
                            labelDisplayUnits: this.settings.labelDisplayUnits, markerWidth: this.settings.markerWidth
                        }
                    });
                    break;
                case `trendLabels`:
                    if (this.data.trendValueOne || this.data.trendValueTwo) {
                        let props: {} = { show: this.settings.showTrend };
                        if (this.settings.showTrend) {
                            props = {
                                show: this.settings.showTrend,
                                trendColor: { solid: { color: this.settings.trendColor } },
                                fontSize: this.settings.trendfontSize, fontFamily: this.settings.trendfontFamily,
                                trendDisplayUnits: this.settings.trendDisplayUnits, lineWidth: this.settings.lineWidth
                            };
                        }
                        objectEnumeration.push({ objectName, selector: null, properties: props });
                    }
                    break;
                case `PercentageDatalabels`:
                    objectEnumeration.push({
                        objectName: `PercentageDataLabels`,
                        selector: null,
                        properties: {
                            show: this.settings.showPercentage, showRemaining: this.settings.showRemainingPercentage,
                            PercentageDataColor: { solid: { color: this.settings.PercentageDataColor } },
                            fontSize: this.settings.percentagefontSize, fontFamily: this.settings.percentagefontFamily
                        }
                    });
                    break;
                default:
                    break;
            }
            return objectEnumeration;
        }

        private getFormattedData(value: number, displayUnits: number, precision: number, format: string): string {
            let formattedData: string;
            let formatterVal: number = displayUnits;
            if (value === null) {
                value = 0;
            }
            if (displayUnits === 0) {
                let alternateFormatter: number = parseInt(value.toString(), 10).toString().length;
                if (alternateFormatter > 9) {
                    formatterVal = 1e9;
                } else if (alternateFormatter <= 9 && alternateFormatter > 6) {
                    formatterVal = 1e6;
                } else if (alternateFormatter <= 6 && alternateFormatter >= 4) {
                    formatterVal = 1e3;
                } else {
                    formatterVal = 10;
                }
            }
            if (!format) {
                format = valueFormatter.DefaultNumericFormat;
            }
            precision = precision === null ? 0 : precision;
            let formatter: IValueFormatter = valueFormatter.create({
                cultureSelector: this.host.locale,
                format,
                precision,
                value: formatterVal,
            });
            formattedData = formatter.format(value);
            return formattedData;
        }

        private getFormattedTooltipData(format: string, value: number): string {
            let formattedData: string;
            let formatter: IValueFormatter;
            if (format === "" || format === undefined) {
                format = valueFormatter.DefaultNumericFormat;
            }
            formatter = valueFormatter.create({
                cultureSelector: this.host.locale,
                format
            });
            formattedData = formatter.format(value);
            if (format !== undefined) {
                if (format.indexOf(".") > 0) {
                    let dataFormatter: IValueFormatter = valueFormatter.create({
                        format,
                        value: 0
                    });
                    formattedData = dataFormatter.format(value);
                }
            }
            return formattedData;
        }
    }
}