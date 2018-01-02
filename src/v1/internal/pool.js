/**
 * Copyright (c) 2002-2018 "Neo Technology,"
 * Network Engine for Objects in Lund AB [http://neotechnology.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

class Pool {
  /**
   * @param create  an allocation function that creates a new resource. It's given
   *                a single argument, a function that will return the resource to
   *                the pool if invoked, which is meant to be called on .dispose
   *                or .close or whatever mechanism the resource uses to finalize.
   * @param destroy called with the resource when it is evicted from this pool
   * @param validate called at various times (like when an instance is acquired and
   *                 when it is returned). If this returns false, the resource will
   *                 be evicted
   * @param maxIdle the max number of resources that are allowed idle in the pool at
   *                any time. If this threshold is exceeded, resources will be evicted.
   */
  constructor(create, destroy=(()=>true), validate=(()=>true), maxIdle=50) {
    this._create = create;
    this._destroy = destroy;
    this._validate = validate;
    this._maxIdle = maxIdle;
    this._pools = {};
    this._release = this._release.bind(this);
  }

  acquire(key) {
    let resource;
    let pool = this._pools[key];
    if (!pool) {
      pool = [];
      this._pools[key] = pool;
    }
    while (pool.length) {
      resource = pool.pop();

      if (this._validate(resource)) {
        return resource;
      } else {
        this._destroy(resource);
      }
    }

    return this._create(key, this._release);
  }

  purge(key) {
    let resource;
    let pool = this._pools[key] || [];
    while (pool.length) {
      resource = pool.pop();
      this._destroy(resource)
    }
    delete this._pools[key]
  }

  purgeAll() {
    Object.keys(this._pools).forEach(key => this.purge(key));
  }

  has(key) {
    return (key in this._pools);
  }

  _release(key, resource) {
    let pool = this._pools[key];
    if (!pool) {
      // key has been purged, don't put it back, just destroy the resource
      this._destroy(resource);
      return;
    }
    if( pool.length >= this._maxIdle || !this._validate(resource) ) {
      this._destroy(resource);
    } else {
      pool.push(resource);
    }
  }
}

export default Pool
