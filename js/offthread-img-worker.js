/**
* Copyright 2015 Google Inc. All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
* or implied. See the License for the specific language governing
* permissions and limitations under the License.
*/

let processing = 0;
let maxQueue = 10;

class ImageHandler {

	constructor (workerContext) {
		this.queue = [];
		this.workerContext = workerContext;
	}

	enqueue (toEnqueue) {

		if (this.queue.indexOf(toEnqueue) >= 0)
			return;

		this.queue.push(toEnqueue);

		if( processing < maxQueue ) this.processQueue();

	}

	processQueue () {

		if (this.queue.length === 0){
			processing = 0;
			return;
		}

		processing++;

		let job = this.queue.shift();
		let url = job.message;

		return fetch(url)

		.then( response => {

			if (response.status !== 200) {

				throw( response.status );

			}

			return response.blob()
		})

		.then( blobData => {

			return createImageBitmap( blobData, { imageOrientation: 'flipY' } );

		}, err => {

			this.workerContext.postMessage({
				id: job.id,
				message: 'error',
				url: url,
				error: err,
				imageBitmap: null
			});

		} )

		.then( imageBitmap => {
			this.workerContext.postMessage({
				id: job.id,
				message: 'image',
				url: url,
				error: null,
				imageBitmap: imageBitmap
			}, [imageBitmap]);
		}, err => {
			this.workerContext.postMessage({
				id: job.id,
				message: 'error',
				url: url,
				error: err.toString(),
				imageBitmap: null
			});
		})

		.then(() => this.processQueue())
		.catch(() => this.processQueue())

	}

}

let handler = new ImageHandler(self);

self.onmessage = (evt) => handler.enqueue(evt.data);
